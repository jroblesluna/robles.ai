import { Link } from "wouter";
import { Newspaper, Settings } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const quickActions = [
  {
    href: "/admin/dominical",
    title: "Dominical IA",
    description: "Review and publish your weekly LinkedIn post",
    icon: Newspaper,
  },
  {
    href: "/admin/settings",
    title: "Settings",
    description: "LinkedIn, image provider, and notification preferences",
    icon: Settings,
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Dominical IA admin panel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickActions.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
