import fs from 'fs';
const reps = [
  {f:'src/utils/emailTemplates.ts', s:/kycApproved/g, r:'verificationApproved'},
  {f:'src/utils/emailTemplates.ts', s:/kycRejected/g, r:'verificationRejected'},
  {f:'src/utils/emailTemplates.ts', s:/KYC verification/g, r:'verification'},
  {f:'src/services/email.service.ts', s:/sendKycApproved/g, r:'sendVerificationApproved'},
  {f:'src/services/email.service.ts', s:/kycApproved/g, r:'verificationApproved'},
  {f:'src/services/email.service.ts', s:/sendKycRejected/g, r:'sendVerificationRejected'},
  {f:'src/services/email.service.ts', s:/kycRejected/g, r:'verificationRejected'},
  {f:'src/services/user.service.ts', s:/sendKycApproved/g, r:'sendVerificationApproved'},
  {f:'src/services/user.service.ts', s:/sendKycRejected/g, r:'sendVerificationRejected'},
  {f:'src/services/user.service.ts', s:/KYC Approved/g, r:'Verification Approved'},
  {f:'src/services/user.service.ts', s:/KYC Rejected/g, r:'Verification Rejected'},
  {f:'src/services/user.service.ts', s:/KYC verification/g, r:'verification'},
  {f:'src/services/user.service.ts', s:/KYC application/g, r:'application'},
  {f:'src/services/partner.service.ts', s:/sendKycApproved/g, r:'sendVerificationApproved'},
  {f:'src/services/partner.service.ts', s:/sendKycRejected/g, r:'sendVerificationRejected'},
  {f:'src/routes/user.routes.ts', s:/:id\/kyc/g, r:':id/verification'},
  {f:'src/routes/user.routes.ts', s:/update KYC status/g, r:'update verification status'},
  {f:'src/services/auth.service.ts', s:/International KYC ID/g, r:'International ID'},
  {f:'src/controllers/user.controller.ts', s:/User KYC status updated/g, r:'User verification status updated'},
  {f:'src/controllers/user.controller.ts', s:/Error updating KYC status/g, r:'Error updating verification status'},
  {f:'src/controllers/user.controller.ts', s:/Failed to update KYC status/g, r:'Failed to update verification status'}
];
reps.forEach(rep => {
  const p = 'd:/Projects/AECCI/global/aecci_back/' + rep.f;
  if (fs.existsSync(p)) {
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace(rep.s, rep.r);
    fs.writeFileSync(p, c);
    console.log('Fixed', p);
  }
});