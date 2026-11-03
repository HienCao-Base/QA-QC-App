"use client";

import { useActionState } from "react";
import { CircleAlert } from "lucide-react";
import { signIn } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <Card className="shadow-sm">
      <CardContent>
        <form action={action}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="username">Tên đăng nhập</FieldLabel>
              <Input id="username" name="username" autoCapitalize="none" autoComplete="username" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            {error && (
              <Alert variant="destructive" role="alert">
                <CircleAlert aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button size="lg" className="w-full" disabled={pending}>
              {pending && <Spinner />} Đăng nhập
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
