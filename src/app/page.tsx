"use client";

import dynamic from "next/dynamic";

const ConverterLayout = dynamic(
  () =>
    import("@/components/converter/converter-layout").then(
      (mod) => mod.ConverterLayout
    ),
  { ssr: false }
);

export default function Home() {
  return <ConverterLayout />;
}
