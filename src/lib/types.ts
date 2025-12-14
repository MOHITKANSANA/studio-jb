export type Pdf = {
  id: string;
  name: string;
  description: string;
  url: string;
  access: 'free' | 'paid';
};

export type Paper = {
  id: string;
  name: string;
  number: number;
  gradient: string;
  pdfs: Pdf[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  exam: string;
};
