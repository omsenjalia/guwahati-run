import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/app-icon";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const px = size === "512" ? 512 : 192;
  return new ImageResponse(<AppIcon px={px} />, { width: px, height: px });
}
