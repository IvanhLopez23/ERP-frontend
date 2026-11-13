"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { iniciales, nombreCompleto } from "@/lib/auth/storage";
import { mediaUrl } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { sesion, cerrarSesion } = useAuth();
  const router = useRouter();
  const foto = mediaUrl(sesion?.perfil?.foto);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-7">
          {foto && <AvatarImage src={foto} alt="" />}
          <AvatarFallback className="text-[10px] font-semibold">
            {iniciales(sesion)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[150px] truncate font-medium sm:inline">
          {nombreCompleto(sesion)}
        </span>
        <span className="sr-only">Abrir menú de usuario</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">
              {nombreCompleto(sesion)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {sesion?.correo ?? sesion?.nombreUsuario ?? ""}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push("/perfil")}
        >
          <UserRound className="size-4" aria-hidden="true" />
          Mi perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onClick={() => void cerrarSesion()}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
