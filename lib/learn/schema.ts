import { z } from "zod";

const explain = z.string().min(20).describe("1-3 plain sentences: why the answer is right, ideally with a real product example");

export const QuestionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mcq"), prompt: z.string(), options: z.array(z.string()).min(3).max(4), answer: z.number().int().min(0).max(3), explain }),
  z.object({ type: z.literal("tf"), prompt: z.string(), answer: z.boolean(), explain }),
  z.object({
    type: z.literal("match"),
    prompt: z.string(),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(3).max(4),
    explain,
  }),
  z.object({ type: z.literal("order"), prompt: z.string(), steps: z.array(z.string()).min(3).max(5).describe("In the CORRECT order; the app shuffles them"), explain }),
  z.object({
    type: z.literal("tree"),
    prompt: z.string(),
    root: z.string().describe("The parent metric"),
    options: z.array(z.string()).min(5).max(6),
    correct: z.array(z.number().int().min(0).max(5)).min(2).max(3).describe("Indexes of options that are true drivers of the root"),
    explain,
  }),
  z.object({
    type: z.literal("spot"),
    prompt: z.string(),
    lines: z.array(z.string()).min(3).max(5),
    wrong: z.number().int().min(0).max(4).describe("Index of the one line that is wrong"),
    explain,
  }),
]);

export const LessonSchema = z.object({
  id: z.string().regex(/^u\d{2}-l\d$/),
  title: z.string(),
  teach: z.array(z.string()).min(2).max(4).describe("Short teaching cards shown before the questions, 1-3 sentences each"),
  questions: z.array(QuestionSchema).min(7).max(10),
});

export const UnitSchema = z.object({
  id: z.string().regex(/^u\d{2}$/),
  title: z.string(),
  summary: z.string(),
  icon: z.string().describe("One emoji"),
  lessons: z.array(LessonSchema).length(4),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Unit = z.infer<typeof UnitSchema>;
