export type Pdf = {
  id: string;
  name: string;
  description: string;
  googleDriveLink: string;
  accessType: 'Free' | 'Paid';
  paperId: string;
  tabId: string;
};

export type Tab = {
  id: string;
  name: string;
  paperId: string;
  pdfs?: Pdf[];
}

export type Paper = {
  id: string;
  name: string;
  description: string;
  paperNumber: number;
  gradient?: string; // Optional gradient for styling
  tabs?: Tab[]; // This will be populated from a subcollection
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  role: 'student' | 'admin';
};
