"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-language";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Save } from "lucide-react";

export default function AdminProfilePage() {
  const { t } = useLanguage();

  // Placeholder user data
  const user = {
    name: "Admin User",
    email: "admin@example.com",
    avatarUrl: `https://placehold.co/100x100.png`, // Placeholder avatar
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    alert("Profile update submitted (placeholder)");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground">{t('userProfile')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('profileInformation')}</CardTitle> {/* Add to JSON */}
          <CardDescription>{t('updateYourProfileDetails')}</CardDescription> {/* Add to JSON */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile avatar" />
                <AvatarFallback>
                  <UserCircle className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" type="button">{t('changeAvatar')}</Button> {/* Add to JSON */}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('fullName')}</Label>
              <Input id="name" defaultValue={user.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" defaultValue={user.email} readOnly disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="current-password">{t('currentPassword')}</Label> {/* Add to JSON */}
              <Input id="current-password" type="password" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">{t('newPassword')}</Label> {/* Add to JSON */}
              <Input id="new-password" type="password" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('confirmNewPassword')}</Label> {/* Add to JSON */}
              <Input id="confirm-password" type="password" />
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> {t('saveChanges')} {/* Add to JSON */}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
