export type Pdf = {
  id: string;
  name: string;
  description: string;
  googleDriveLink: string;
  accessType: 'Free' | 'Paid';
  paperId: string;
};

export type Paper = {
  id: string;
  name: string;
  paperNumber: number;
  gradient?: string; // Optional gradient for styling
  pdfs?: Pdf[]; // This might be populated from a subcollection
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'admin';
};
