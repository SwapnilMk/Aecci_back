import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.config';
import { config } from '../config/config';
import { emailService } from './email.service';
import { redis } from '../config/redis.config';
import { emailQueue } from '../queues/email.queue';

export class AuthService {
  async sendOtp(userData: any): Promise<{ message: string }> {
    const { email, fullName } = userData;

    if (!email) {
      throw new Error('Email is required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const cooldownKey = `otp_cooldown:${email}`;
    const isCooldown = await redis.get(cooldownKey);
    if (isCooldown) {
      throw new Error('Please wait 2 minutes before requesting another OTP');
    }

    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis (15 mins TTL)
    await redis.setex(`otp:${email}`, 900, emailOtp);
    
    // Set 2 minute cooldown
    await redis.setex(cooldownKey, 120, '1');

    await emailQueue.add('send-otp', {
      type: 'sendOTP',
      payload: { email, fullName: fullName || 'User', otp: emailOtp }
    });

    return { message: 'OTP sent to email' };
  }

  async signup(userData: any): Promise<{ user: any; accessToken: string; refreshToken: string; message: string }> {
    const { email, password, ...restData } = userData;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const verifiedKey = `otp_verified:${email}`;
    const isVerified = await redis.get(verifiedKey);
    
    if (!isVerified) {
      throw new Error('Email not verified. Please verify OTP first.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const payloadData = { ...restData };
    if (typeof payloadData.internationalBusinessIds === 'object') {
      payloadData.internationalBusinessIds = JSON.stringify(payloadData.internationalBusinessIds);
    }
    if (typeof payloadData.internationalKycIds === 'object') {
      payloadData.internationalKycIds = JSON.stringify(payloadData.internationalKycIds);
    }

    const arrayFields = [
      'products', 'targetMarkets', 'keyCertifications', 
      'expertiseAreas', 'sectorsOfInterest', 'languagesSpoken'
    ];
    
    for (const field of arrayFields) {
      if (typeof payloadData[field] === 'string') {
        payloadData[field] = payloadData[field].split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isEmailVerified: true,
        ...payloadData,
      },
    });

    await emailQueue.add('registration-success', {
      type: 'sendRegistrationSubmitted',
      payload: { email: newUser.email, fullName: newUser.fullName || 'User', userId: newUser.id }
    });

    await redis.del(verifiedKey);

    const { accessToken, refreshToken } = this.generateTokens(newUser);
    const { password: _, ...userToReturn } = newUser;

    return { user: userToReturn, accessToken, refreshToken, message: 'Registration successful' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
    const storedOtp = await redis.get(`otp:${email}`);
    
    if (!storedOtp) throw new Error('No OTP request found for this email or OTP has expired');
    if (storedOtp !== otp) throw new Error('Invalid OTP');

    // Mark as verified for 1 hour
    await redis.setex(`otp_verified:${email}`, 3600, '1');
    await redis.del(`otp:${email}`);

    return { message: 'Email verified successfully' };
  }

  async updateProfile(userId: string, profileData: any): Promise<any> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: profileData
    });
    
    // Send "Registration Successfully Submitted" email
    await emailService.sendRegistrationSubmitted(user.email, user.fullName || 'User', user.id);

    const { password: _, ...userToReturn } = user;
    return userToReturn;
  }

  async refreshAccess(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const secret = config.JWT_REFRESH_SECRET;
      const decoded: any = jwt.verify(refreshToken, secret);
      
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new Error('User not found');
      
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      
      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
