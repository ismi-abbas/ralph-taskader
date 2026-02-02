"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";

export default function LoginButton() {
  return (
    <Button
      className="w-full"
      size="lg"
      onClick={() => {
        authClient.signIn.social({
          provider: "github",
          callbackURL: `${window.location.origin}/dashboard`,
        });
      }}
    >
      <Image
        src="/github.svg"
        alt="GitHub Logo"
        width={20}
        height={20}
        className="mr-2"
      />
      Continue with GitHub
    </Button>
  );
}
