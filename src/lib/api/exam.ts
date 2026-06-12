import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Direct lightweight server-side function to query Gemini API
export const generateSubjectExam = createServerFn({ method: "POST" })
  .validator(z.object({ subject: z.string().min(1) }))
  .handler(async ({ data: { subject } }) => {
    const geminiApiKey = (
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      ""
    ).trim();

    if (!geminiApiKey) {
      console.warn("GEMINI_API_KEY is not configured on the server. Falling back to local template questions.");
      return getFallbackQuestions(subject);
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      
      const prompt = `Generate exactly 5 multiple-choice questions to test competency in the subject: "${subject}". 
      Each question must have exactly 4 options. Make the questions academically rigorous and conceptually deep.
      Return ONLY a JSON array matching the following schema:
      [
        {
          "id": 1,
          "q": "The question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": 0
        }
      ]
      where "answer" is the 0-indexed correct option index (e.g. 0 means options[0] is correct).
      Return raw JSON only. Do not wrap in markdown tags like \`\`\`json.`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status: ${response.status}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Parse the clean JSON response from Gemini
      const questions = JSON.parse(rawText.trim());
      
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.map((q, idx) => ({
          id: idx + 1,
          q: q.q || `Competency Question ${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
          answer: typeof q.answer === "number" && q.answer >= 0 && q.answer < 4 ? q.answer : 0,
        }));
      }

      throw new Error("Invalid array format returned by AI model");
    } catch (error) {
      console.error("Gemini API call failed, generating fallback questions:", error);
      return getFallbackQuestions(subject);
    }
  });

// Dynamic fallback template in case of API failure or missing keys
function getFallbackQuestions(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes("math") || s.includes("calculus") || s.includes("algebra")) {
    return [
      { id: 1, q: `If f(x) = 2x² + 3x - 5, what is f(2) in ${subject}?`, options: ["9", "13", "11", "7"], answer: 1 },
      { id: 2, q: "What is the derivative of x³ + 4x?", options: ["3x² + 4", "3x²", "x² + 4", "2x + 4"], answer: 0 },
      { id: 3, q: "Which value is the limit of 1/x as x approaches infinity?", options: ["1", "Infinity", "0", "Undefined"], answer: 2 },
      { id: 4, q: "What is the primary coordinate system using angles and radius?", options: ["Cartesian", "Polar", "Spherical", "Cylindrical"], answer: 1 },
      { id: 5, q: "What is the sum of angles in a flat triangle?", options: ["90°", "180°", "360°", "270°"], answer: 1 },
    ];
  }

  if (s.includes("science") || s.includes("physics") || s.includes("chemistry") || s.includes("biology")) {
    return [
      { id: 1, q: `What is the chemical formula for water in ${subject}?`, options: ["CO2", "NaCl", "H2O", "CH4"], answer: 2 },
      { id: 2, q: "Which of these is a balanced equation?", options: ["H2 + O2 → H2O", "2H2 + O2 → 2H2O", "H + O → H2O", "H2 + 2O → H2O"], answer: 1 },
      { id: 3, q: "What is Newton's second law?", options: ["F = ma", "E = mc²", "P = mv", "v = d/t"], answer: 0 },
      { id: 4, q: "Which organelle is considered the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"], answer: 2 },
      { id: 5, q: "What is the pH level of pure distilled water?", options: ["5", "7", "9", "14"], answer: 1 },
    ];
  }

  // Default General Subject template
  return [
    { id: 1, q: `Define the primary objective when studying: ${subject}.`, options: ["Conceptual mastery", "CV optimization", "Rote learning", "None of the above"], answer: 0 },
    { id: 2, q: `Which of the following describes the most active pedagogy in ${subject}?`, options: ["Interactive learning", "Passive listening", "Silent reading", "Memorization"], answer: 0 },
    { id: 3, q: "Which term describes a statement verified as true?", options: ["Hypothesis", "Theory", "Fact", "Opinion"], answer: 2 },
    { id: 4, q: "What is the primary method of validation in modern research?", options: ["Peer review", "Online polls", "Personal preference", "Social consensus"], answer: 0 },
    { id: 5, q: "What is the base base-10 number system?", options: ["Binary", "Octal", "Hexadecimal", "Decimal"], answer: 3 },
  ];
}
