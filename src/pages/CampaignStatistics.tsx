import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { BarChart2, MailCheck, Users, MousePointerClick, MailX, AlertCircle, MailMinus, RefreshCw, Download } from "lucide-react";
import Navbar from "@/components/Navbar";

const API_BASE_URL = "/_functions";

interface ManagedSite {
    _id: string;
    siteName: string;
    siteId: string;
    campaignId?: string;
}

interface CampaignStats {
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    notSent: number;
}

interface CampaignRecipient {
    contactId: string;
    lastActivityDate: string;
    emailAddress?: string;
    fullName?: string;
    contactDeleted?: boolean; // This field is returned by the API
}

const StatCard = ({ icon: Icon, title, value }) => (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const CampaignStatistics = () => {
    const [sites, setSites] = useState<ManagedSite[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState("");
    const [selectedCampaignId, setSelectedCampaignId] = useState("");
    const [selectedActivity, setSelectedActivity] = useState("DELIVERED");

    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [isFetchingStats, setIsFetchingStats] = useState(false);
    const [isFetchingRecipients, setIsFetchingRecipients] = useState(false);

    const [stats, setStats] = useState<CampaignStats | null>(null);
    const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
    
    useEffect(() => {
        const loadSites = async () => {
            setIsLoadingSites(true);
            try {
                const response = await fetch(`${API_BASE_URL}/listSites`);
                if (!response.ok) throw new Error('Failed to fetch sites.');
                const data = await response.json();
                setSites(data);
                if (data.length > 0) {
                    setSelectedSiteId(data[0].siteId);
                }
            } catch (error) {
                toast.error("Error fetching managed sites.");
            } finally {
                setIsLoadingSites(false);
            }
        };
        loadSites();
    }, []);

    useEffect(() => {
        setSelectedCampaignId("");
        setStats(null);
        setRecipients([]);
    }, [selectedSiteId]);

    useEffect(() => {
        if (selectedCampaignId) {
            handleFetchStats();
        } else {
            setStats(null);
        }
        setRecipients([]);
    }, [selectedCampaignId]);

    const handleFetchStats = async () => {
        if (!selectedSiteId || !selectedCampaignId) return;
        setIsFetchingStats(true);
        setStats(null);
        try {
            const response = await fetch(`${API_BASE_URL}/getCampaignStats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetSiteId: selectedSiteId, campaignIds: [selectedCampaignId] }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch stats.');
            }
            const data = await response.json();
            if (data.statistics && data.statistics.length > 0) {
                setStats(data.statistics[0].email);
            } else {
                 toast.info("No statistics found for this campaign.");
            }
        } catch (error) {
            toast.error("Could not fetch campaign stats.", { description: error.message });
        } finally {
            setIsFetchingStats(false);
        }
    };
    
    const handleFetchRecipients = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedSiteId || !selectedCampaignId || !selectedActivity) {
            toast.warning("Please select a project, campaign, and activity type.");
            return;
        }
        setIsFetchingRecipients(true);
        setRecipients([]);
        try {
             const response = await fetch(`${API_BASE_URL}/getCampaignRecipients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetSiteId: selectedSiteId, campaignId: selectedCampaignId, activity: selectedActivity }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch recipients.');
            }
            const data = await response.json();
            
            // **FIXED**: Filter out recipients where contactDeleted is true
            const activeRecipients = (data.recipients || []).filter(r => !r.contactDeleted);
            
            setRecipients(activeRecipients);
            if (activeRecipients.length === 0) {
                toast.info("No active recipients found for this activity.");
            }
        } catch (error) {
            toast.error("Could not fetch recipients.", { description: error.message });
        } finally {
            setIsFetchingRecipients(false);
        }
    };
    
    const exportEmailsToTxt = (recipients, activity) => {
        const emails = recipients.map(r => r.emailAddress).filter(Boolean);
        if(emails.length === 0) {
            toast.warning("No email addresses to export for this list.");
            return;
        }
        const textContent = emails.join('\n');
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const siteName = sites.find(s => s.siteId === selectedSiteId)?.siteName || 'export';
        link.href = URL.createObjectURL(blob);
        link.download = `${siteName}_${selectedCampaignId}_${activity}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const selectedSite = sites.find(site => site.siteId === selectedSiteId);
    const availableCampaign = selectedSite?.campaignId ? { name: `Campaign (${selectedSite.campaignId.substring(0, 8)}...)`, id: selectedSite.campaignId } : null;

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center gap-4 animate-fade-in">
                        <BarChart2 className="h-10 w-10 text-primary" />
                        <div><h1 className="text-3xl font-bold">Campaign Statistics</h1><p className="text-muted-foreground">View recipient lists for your email campaigns.</p></div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Overview</CardTitle>
                            <CardDescription>A high-level summary of the selected campaign's performance.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {isFetchingStats ? ( <p className="col-span-full text-center">Loading stats...</p> ) 
                            : stats ? (
                                <>
                                    <StatCard icon={MailCheck} title="Delivered" value={stats.delivered} />
                                    <StatCard icon={Users} title="Opened" value={stats.opened} />
                                    <StatCard icon={MousePointerClick} title="Clicked" value={stats.clicked} />
                                    <StatCard icon={MailX} title="Bounced" value={stats.bounced} />
                                    <StatCard icon={AlertCircle} title="Complained" value={stats.complained} />
                                    <StatCard icon={MailMinus} title="Not Sent" value={stats.notSent} />
                                </>
                            ) : ( <p className="col-span-full text-center text-muted-foreground">Select a campaign to see its overview.</p> )}
                        </CardContent>
                    </Card>

                    <Card>
                        <form onSubmit={handleFetchRecipients}>
                            <CardHeader>
                                <CardTitle>View Recipient Lists</CardTitle>
                                <CardDescription>Choose a project, campaign, and activity type to view the list of recipients.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={isLoadingSites}>
                                    <SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger>
                                    <SelectContent>
                                        {sites.map(site => <SelectItem key={site.siteId} value={site.siteId}>{site.siteName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={!selectedSiteId || !availableCampaign}>
                                    <SelectTrigger><SelectValue placeholder="Select a campaign..." /></SelectTrigger>
                                    <SelectContent>
                                        {availableCampaign ? (
                                            <SelectItem value={availableCampaign.id}>{availableCampaign.name}</SelectItem>
                                        ) : (
                                            <SelectItem value="disabled" disabled>No campaign ID set</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                                        <SelectItem value="OPENED">Opened</SelectItem>
                                        <SelectItem value="CLICKED">Clicked</SelectItem>
                                        <SelectItem value="BOUNCED">Bounced</SelectItem>
                                        <SelectItem value="NOT_SENT">Not Sent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" disabled={isFetchingRecipients || !selectedCampaignId}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetchingRecipients ? 'animate-spin' : ''}`} />
                                    {isFetchingRecipients ? "Fetching..." : "Fetch Recipients"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Recipient List</CardTitle><CardDescription>Showing {recipients.length} recipient(s) for the "{selectedActivity}" activity.</CardDescription></div>
                            <Button variant="outline" size="sm" onClick={() => exportEmailsToTxt(recipients, selectedActivity)} disabled={recipients.length === 0}><Download className="mr-2 h-4 w-4" />Export Emails</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Email Address</TableHead><TableHead>Full Name</TableHead><TableHead>Last Activity Date</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {isFetchingRecipients ? (<TableRow><TableCell colSpan={3} className="text-center h-24">Loading recipients...</TableCell></TableRow>) 
                                        : recipients.length > 0 ? (
                                            recipients.map(recipient => (
                                                <TableRow key={recipient.contactId}>
                                                    <TableCell>{recipient.emailAddress || 'N/A'}</TableCell>
                                                    <TableCell>{recipient.fullName || 'N/A'}</TableCell>
                                                    <TableCell>{new Date(recipient.lastActivityDate).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (<TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No recipients to display. Please make a selection and fetch data.</TableCell></TableRow>)}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CampaignStatistics;