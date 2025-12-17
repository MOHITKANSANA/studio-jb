export type Pdf = {
  id: string;
  name: string;
  description: string;
  googleDriveLink: string;
  accessType: 'Free' | 'Paid';
  paperId: string;
  tabId: string;
  createdAt: any; // Firestore ServerTimestamp
};

export type Tab = {
  id: string;
  name: string;
  paperId: string;
  pdfs?: Pdf[];
  createdAt: any; // Firestore ServerTimestamp
}

export type Paper = {
  id: string;
  name: string;
  description: string;
  paperNumber: number;
  tabs?: Tab[]; // This will be populated on the client
  createdAt: any; // Firestore ServerTimestamp
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  role: 'student' | 'admin';
};

export type Combo = {
  id: string;
  name: string;
  description: string;
  accessType: 'Free' | 'Paid';
  price?: number;
  pdfIds: string[];
  pdfs?: Pdf[]; // Populated on the client
  createdAt: any; // Firestore ServerTimestamp
};
