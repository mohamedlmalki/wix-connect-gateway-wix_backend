import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, Settings, Users, BarChart2, Trash2 } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-center relative">
        <Link to="/" className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent absolute left-4">
          WixVelo
        </Link>
        
        <div className="hidden md:flex items-center gap-2">
           <Link to="/import">
            <Button 
              variant={isActive("/import") ? "default" : "ghost"} 
              size="sm"
              className="gap-2"
            >
              <Users size={16} />
              Velo Import
            </Button>
          </Link>

          <Link to="/bulk-delete">
            <Button 
              variant={isActive("/bulk-delete") ? "default" : "ghost"} 
              size="sm"
              className="gap-2"
            >
              <Trash2 size={16} />
              Bulk Manage
            </Button>
          </Link>
          
          <Link to="/campaign-stats">
            <Button 
              variant={isActive("/campaign-stats") ? "default" : "ghost"} 
              size="sm"
              className="gap-2"
            >
              <BarChart2 size={16} />
              Campaigns
            </Button>
          </Link>

          <Link to="/manage-sites">
            <Button 
              variant={isActive("/manage-sites") ? "default" : "ghost"} 
              size="sm"
              className="gap-2"
            >
              <Settings size={16} />
              Manage Sites
            </Button>
          </Link>
          <Link to="/contact">
            <Button 
              variant={isActive("/contact") ? "default" : "ghost"} 
              size="sm"
              className="gap-2"
            >
              <Mail size={16} />
              Contact
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
