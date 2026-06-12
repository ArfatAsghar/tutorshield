export interface Tutor {
  id: string;
  name: string;
  subjects: string[];
  rating: number;
  reviews: number;
  hourlyRate: number;
  verified: boolean;
  city: string;
  experience: number;
  bio: string;
  avatar: string;
  badges: string[];
}

export const tutors: Tutor[] = [
  { id: "t1", name: "Ayesha Khan", subjects: ["Mathematics", "Physics"], rating: 4.9, reviews: 128, hourlyRate: 25, verified: true, city: "Karachi", experience: 6, bio: "Cambridge-trained STEM tutor focused on conceptual clarity and exam strategy.", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=ayesha", badges: ["Verified", "Top Rated", "Background Checked"] },
  { id: "t2", name: "Daniel Okafor", subjects: ["English", "Literature"], rating: 4.8, reviews: 94, hourlyRate: 22, verified: true, city: "Lagos", experience: 8, bio: "Helping students write with clarity, voice, and confidence.", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=daniel", badges: ["Verified", "Mentor"] },
  { id: "t3", name: "Priya Sharma", subjects: ["Chemistry", "Biology"], rating: 5.0, reviews: 211, hourlyRate: 30, verified: true, city: "Mumbai", experience: 10, bio: "MSc Biochem. Specialised in MCAT and pre-med prep.", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=priya", badges: ["Verified", "Top Rated", "Expert"] },
  { id: "t4", name: "Hamza Ali", subjects: ["Computer Science", "Mathematics"], rating: 4.7, reviews: 56, hourlyRate: 28, verified: false, city: "Islamabad", experience: 3, bio: "Software engineer teaching coding and algorithms to teens.", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=hamza", badges: ["Pending Verification"] },
  { id: "t5", name: "Sara Ahmed", subjects: ["Urdu", "Islamic Studies"], rating: 4.9, reviews: 73, hourlyRate: 18, verified: true, city: "Lahore", experience: 5, bio: "Patient, structured, and warm — loved by primary school parents.", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=sara", badges: ["Verified", "Background Checked"] },
  { id: "t6", name: "Marcus Lee", subjects: ["Economics", "Business"], rating: 4.6, reviews: 41, hourlyRate: 35, verified: true, city: "Singapore", experience: 7, bio: "Ex-banker turned IB Economics specialist.", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=marcus", badges: ["Verified"] },
];

export const verificationQuestions = [
  { id: 1, q: "If f(x) = 2x² + 3x − 5, what is f(2)?", options: ["9", "13", "11", "7"], answer: 1 },
  { id: 2, q: "Which of the following is a balanced chemical equation?", options: ["H2 + O2 → H2O", "2H2 + O2 → 2H2O", "H + O → H2O", "H2 + 2O → H2O"], answer: 1 },
  { id: 3, q: "Identify the subject of: 'The students working on the project submitted their report.'", options: ["The students", "the project", "their report", "working"], answer: 0 },
  { id: 4, q: "What is the time complexity of binary search?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], answer: 2 },
  { id: 5, q: "Newton's second law is best expressed as:", options: ["F = ma", "E = mc²", "P = mv", "a = v/t"], answer: 0 },
];

export const progressReports = [
  { id: "p1", date: "2026-06-05", student: "Zain", subject: "Mathematics", topic: "Quadratic Equations", rating: 4, notes: "Strong grasp of factoring. Needs practice with the quadratic formula." },
  { id: "p2", date: "2026-06-03", student: "Zain", subject: "Mathematics", topic: "Linear Functions", rating: 5, notes: "Excellent session. Completed all homework with full understanding." },
  { id: "p3", date: "2026-06-01", student: "Zain", subject: "Mathematics", topic: "Polynomials", rating: 3, notes: "Distracted today. Recommend a shorter session next time." },
];

export const reviewsData = [
  { id: "r1", parent: "Fatima M.", rating: 5, date: "2 weeks ago", text: "Verification exam gave us real confidence. Our daughter's grades jumped a full letter in one term." },
  { id: "r2", parent: "Omar R.", rating: 5, date: "1 month ago", text: "The check-in/check-out feature is a game changer. We always know our tutor is actually showing up." },
  { id: "r3", parent: "Hira K.", rating: 4, date: "1 month ago", text: "Good experience overall. Progress reports are detailed and helpful." },
];

export const messages: { id: string; from: "parent" | "tutor"; text: string; time: string }[] = [
  { id: "m1", from: "tutor", text: "Hi! Looking forward to today's session at 5pm.", time: "10:14" },
  { id: "m2", from: "parent", text: "Great, Zain will be ready. Could you focus on quadratics?", time: "10:16" },
  { id: "m3", from: "tutor", text: "Absolutely. I'll send the worksheet beforehand.", time: "10:17" },
];

export const payments = [
  { id: "pay1", tutor: "Ayesha Khan", amount: 200, status: "Paid", date: "2026-06-01", method: "Card" },
  { id: "pay2", tutor: "Ayesha Khan", amount: 200, status: "Paid", date: "2026-05-01", method: "Card" },
  { id: "pay3", tutor: "Ayesha Khan", amount: 200, status: "In Escrow", date: "2026-07-01", method: "Card" },
];
