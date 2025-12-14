import type { User, Paper } from './types';

export const mockUsers: User[] = [
  { id: '1', name: 'विद्यार्थी कुमार', email: 'student@example.com', role: 'student', exam: 'MPSE / State Exam' },
  { id: '2', name: 'एडमिन बॉस', email: 'admin@example.com', role: 'admin', exam: 'MPSE' },
];

export const mockPapers: Paper[] = [
  {
    id: 'paper-1',
    name: 'Paper I',
    number: 1,
    gradient: 'from-blue-500 to-indigo-600',
    pdfs: [
      { id: 'pdf-1-1', name: 'इतिहास के महत्वपूर्ण नोट्स', description: 'प्राचीन भारत का सम्पूर्ण इतिहास।', url: '#', access: 'free' },
      { id: 'pdf-1-2', name: 'भूगोल - प्रमुख अवधारणाएँ', description: 'भौतिक भूगोल के सिद्धांत।', url: '#', access: 'paid' },
    ],
  },
  {
    id: 'paper-2',
    name: 'Paper II',
    number: 2,
    gradient: 'from-purple-500 to-pink-600',
    pdfs: [
      { id: 'pdf-2-1', name: 'CSAT प्रैक्टिस सेट', description: 'पिछले वर्षों के हल किए गए प्रश्न।', url: '#', access: 'free' },
    ],
  },
  {
    id: 'paper-3',
    name: 'Paper III',
    number: 3,
    gradient: 'from-green-500 to-teal-600',
    pdfs: [
      { id: 'pdf-3-1', name: 'अर्थव्यवस्था की मूल बातें', description: 'भारतीय अर्थव्यवस्था का अवलोकन।', url: '#', access: 'free' },
      { id: 'pdf-3-2', name: 'विज्ञान और प्रौद्योगिकी', description: 'नवीनतम वैज्ञानिक विकास।', url: '#', access: 'paid' },
    ],
  },
  {
    id: 'paper-4',
    name: 'Paper IV',
    number: 4,
    gradient: 'from-orange-500 to-red-600',
    pdfs: [
      { id: 'pdf-4-1', name: 'नीतिशास्त्र और सत्यनिष्ठा', description: 'केस स्टडीज के साथ पूर्ण गाइड।', url: '#', access: 'free' },
    ],
  },
   {
    id: 'paper-5',
    name: 'Paper V',
    number: 5,
    gradient: 'from-cyan-500 to-light-blue-600',
    pdfs: [],
  },
   {
    id: 'paper-6',
    name: 'Paper VI',
    number: 6,
    gradient: 'from-rose-500 to-fuchsia-600',
    pdfs: [],
  },
];
