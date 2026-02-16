import { z } from "zod";

export const signupSchema = z.object({
    firstName: z
        .string({ required_error: "First name is required" })
        .trim()
        .min(2, { message: "First name must be at least 2 characters long" })
        .regex(/^[a-zA-Z\s]+$/, { message: "First name can only contain alphabets and spaces" }),
    lastName: z
        .string({ required_error: "Last name is required" })
        .trim()
        .min(2, { message: "Last name must be at least 2 characters long" })
        .regex(/^[a-zA-Z\s]+$/, { message: "Last name can only contain alphabets and spaces" }),
    email: z
        .string({ required_error: "Email is required" })
        .trim()
        .email({ message: "Invalid email address" }),
    password: z
        .string({ required_error: "Password is required" })
        .trim()
        .min(8, { message: "Password must be at least 8 characters long" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[0-9]/, { message: "Password must contain at least one number" })
        .regex(/[\W_]/, { message: "Password must contain at least one special character" }),
    role: z
        .enum(["user", "admin"], { message: "Role must be either 'user' or 'admin'" })
        .optional(),
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .trim()
        .email({ message: "Invalid email address" }),
    password: z
        .string({ required_error: "Password is required" })
        .trim(),
});

export const updateUserSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2, { message: "First name must be at least 2 characters long" })
        .regex(/^[a-zA-Z\s]+$/, { message: "First name can only contain alphabets and spaces" })
        .optional(),
    lastName: z
        .string()
        .trim()
        .min(2, { message: "Last name must be at least 2 characters long" })
        .regex(/^[a-zA-Z\s]+$/, { message: "Last name can only contain alphabets and spaces" })
        .optional(),
    password: z
        .string()
        .trim()
        .min(8, { message: "Password must be at least 8 characters long" })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
        .regex(/[0-9]/, { message: "Password must contain at least one number" })
        .regex(/[\W_]/, { message: "Password must contain at least one special character" })
        .optional(),
    role: z
        .enum(["user", "admin"], { message: "Role must be either 'user' or 'admin'" })
        .optional(),
    status: z
        .string({ message: "Status must be a string" })
        .optional(),
});