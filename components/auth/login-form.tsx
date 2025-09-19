"use client";
import { CardWrapper } from "./card-wrapper"
import * as z from "zod";
import { LoginSchema } from "@/schemas";
import {useForm} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {Input} from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import {
Form,
FormControl,
FormField,
FormItem,
FormLabel,
FormMessage
} from "@/components/ui/form";
import { Button } from "../ui/button";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";
import { login } from "@/actions/login";
import { useState, useTransition } from "react";

export const LoginForm = () => {

    const searchParams = useSearchParams();
    const urlError = searchParams ? (searchParams.get("error") === "OAuthAccountNotLinked"
    ? "Email already in use with different provider!" : "") : "";
    const [error,setError] = useState<string | undefined>("");
    const [success,setSuccess] = useState<string | undefined>("");
    const [isPending,startTransition] = useTransition();
    const form = useForm<z.infer<typeof LoginSchema>>({
            resolver: zodResolver(LoginSchema),
            defaultValues: {
                email: "",
                password: "",
            },
        }
    );
    const onSubmit = (values: z.infer<typeof LoginSchema>) => {
        setError("");
        setSuccess("");
        startTransition(()=> {
            login(values)
            .then((data)=>{
                // TODO: 2FA
                setSuccess(data?.success);
                setError(data?.error);
                
            })
        });
    }
    return (
        <CardWrapper 
            headerLabel="Welcome back"
            backButtonLabel="Don't have an account?"
            backButtonHref="/auth/register"
            showSocial
        >
            <div className="p-4 mt-4  text-blue-800 text-center">
                Please use Google login
            </div>
            
        </CardWrapper>
    )
}