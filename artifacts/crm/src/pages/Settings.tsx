import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from "@/components/ui/core-ui";

export default function Settings() {
  return (
    <div className="space-y-6 h-full max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your CRM preferences and profile.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Full Name</Label>
              <Input defaultValue="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email Address</Label>
              <Input type="email" defaultValue="jane.smith@example.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Role / Title</Label>
              <Input defaultValue="Partnerships Manager" />
            </div>
          </div>
          <div className="pt-4 border-t flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete all your data and preferences. This action cannot be undone.</p>
          <Button variant="destructive">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
