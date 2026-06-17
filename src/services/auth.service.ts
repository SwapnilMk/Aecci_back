import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.config';
import { config } from '../config/config';
import { emailService } from './email.service';

export class AuthService {
  async signup(userData: any): Promise<{ user: any; message: string }> {
    const { email, mobileNumber, password, fullName, country, userType, companyName } = userData;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new Error('User already exists');
      }
      // If user exists but is not verified, we can update their info and resend OTP
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const emailOtpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          mobileNumber, password: hashedPassword, fullName, country, userType, companyName,
          emailOtp, emailOtpExpiry
        }
      });
      
      await emailService.sendOTP(email, fullName, emailOtp);
      const { password: _, ...userToReturn } = updatedUser;
      return { user: userToReturn, message: 'OTP sent to email' };
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Generate 6 digit OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const emailOtpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        mobileNumber,
        fullName,
        country,
        userType,
        companyName,
        emailOtp,
        emailOtpExpiry,
      },
    });

    // Send Email with OTP
    await emailService.sendOTP(email, fullName, emailOtp);

    const { password: _, ...userToReturn } = newUser;

    return { user: userToReturn, message: 'OTP sent to email' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');
    if (user.isEmailVerified) throw new Error('Email is already verified');
    if (user.emailOtp !== otp) throw new Error('Invalid OTP');
    if (user.emailOtpExpiry && user.emailOtpExpiry < new Date()) throw new Error('OTP has expired');

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        isEmailVerified: true,
        emailOtp: null,
        emailOtpExpiry: null
      }
    });

    const { accessToken, refreshToken } = this.generateTokens(updatedUser);
    const { password: _, ...userToReturn } = updatedUser;
    
    return { user: userToReturn, accessToken, refreshToken };
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
