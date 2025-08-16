import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Settings, 
  Bell, 
  BarChart3, 
  Calendar, 
  Mail, 
  LogOut,
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    // TODO: Replace with actual backend call
    // This would call: await logoutUser()
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
      duration: 3000,
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Dashboard
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Welcome Back!
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <Bell size={16} />
              Notifications
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings size={16} />
              Settings
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h2>
          <p className="text-lg text-muted-foreground">
            You've successfully logged in! This is your personalized dashboard.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card shadow-card border-primary/10 animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-primary/10 animate-slide-up" style={{animationDelay: "0.1s"}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Tasks</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-primary/10 animate-slide-up" style={{animationDelay: "0.2s"}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Items</p>
                  <p className="text-2xl font-bold">6</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-primary/10 animate-slide-up" style={{animationDelay: "0.3s"}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold">+12%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <Card className="bg-gradient-card shadow-card border-primary/10 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your latest actions and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Profile Updated</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New Message Received</p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <Settings className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Settings Modified</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gradient-card shadow-card border-primary/10 animate-slide-up" style={{animationDelay: "0.2s"}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="premium" className="h-auto p-4 flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm">Schedule</span>
                </Button>
                
                <Button variant="premium" className="h-auto p-4 flex-col gap-2">
                  <Mail className="h-6 w-6" />
                  <span className="text-sm">Messages</span>
                </Button>
                
                <Button variant="premium" className="h-auto p-4 flex-col gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Analytics</span>
                </Button>
                
                <Button variant="premium" className="h-auto p-4 flex-col gap-2">
                  <Settings className="h-6 w-6" />
                  <span className="text-sm">Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card className="mt-8 bg-gradient-primary text-primary-foreground shadow-glow animate-glow">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">🎉 Welcome to Your New Dashboard!</h3>
            <p className="text-primary-foreground/90 mb-4">
              You've successfully logged in and this is your personalized space. 
              From here you can manage all your activities and settings.
            </p>
            <Button variant="secondary" size="lg" className="bg-white/10 text-white hover:bg-white/20">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;