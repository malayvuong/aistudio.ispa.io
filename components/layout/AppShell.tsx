import React from "react";

import Footer from "@/components/Footer";
import TopNav from "@/components/layout/TopNav";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1 w-full pb-12">{children}</main>
      <Footer />
    </div>
  );
};

export default AppShell;
