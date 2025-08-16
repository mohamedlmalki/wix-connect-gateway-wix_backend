import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BouncedEmail {
  id: string;
  email: string;
  bouncedDate: Date;
  contactId: string;
}

const BouncedEmails = () => {
  const [bouncedEmails, setBouncedEmails] = useState<BouncedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Mock data for demonstration
  const mockBouncedEmails: BouncedEmail[] = [
    {
      id: "1",
      email: "invalid@domain.com",
      bouncedDate: new Date("2024-01-15T10:30:00Z"),
      contactId: "contact_001"
    },
    {
      id: "2",
      email: "nonexistent@example.com",
      bouncedDate: new Date("2024-01-14T15:45:00Z"),
      contactId: "contact_002"
    },
    {
      id: "3",
      email: "bounced@testmail.com",
      bouncedDate: new Date("2024-01-13T09:20:00Z"),
      contactId: "contact_003"
    }
  ];

  useEffect(() => {
    loadBouncedEmails();
  }, []);

  const loadBouncedEmails = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call to getBouncedEmails()
      // const emails = await getBouncedEmails();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBouncedEmails(mockBouncedEmails);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load bounced emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Replace with actual API call to deleteBouncedEmail(id)
      setBouncedEmails(prev => prev.filter(email => email.id !== id));
      toast({
        title: "Success",
        description: "Bounced email record deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bounced email record",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Mail className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Bounced Emails Dashboard</h1>
                <p className="text-muted-foreground">Track and manage email delivery failures</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                Total Bounces: {bouncedEmails.length}
              </Badge>
              <Button 
                onClick={loadBouncedEmails} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Bounced Email Records</CardTitle>
              <CardDescription>
                Email addresses that failed delivery, sorted by most recent first
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : bouncedEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No bounced emails found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email Address</TableHead>
                        <TableHead>Date Bounced</TableHead>
                        <TableHead>Contact ID</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bouncedEmails.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-medium">
                            {email.email}
                          </TableCell>
                          <TableCell>
                            {formatDate(email.bouncedDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{email.contactId}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(email.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BouncedEmails;