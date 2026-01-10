"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Search,
  RefreshCw,
  Package,
  AlertCircle,
  Info,
  Printer,
  Copy,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { printShippingLabel, printCustomsDocuments } from "@/lib/print-utils";
import { supabase } from "@/lib/supabase";

type Product = {
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  customer: string;
  email: string;
  products: Product[];
  amount: number;
  currency: string;
  status: string;
  date: string;
  shopify_order_id?: string;
  status_logistico?: string;
  total_weight?: number;
};

type SupabaseOrder = {
  id: string;
  shopify_order_id: string;
  status_logistico: string;
  customer_name: string;
  address_json: {
    email?: string;
    [key: string]: any;
  };
  total_value: number;
  currency: string;
  total_weight: number;
  created_at: string;
  updated_at: string;
};

const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "processing", label: "Processing", color: "bg-blue-500" },
  { value: "shipped", label: "Shipped", color: "bg-purple-500" },
  { value: "delivered", label: "Delivered", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
  {
    value: "AGUARDANDO_LOGISTICA",
    label: "Awaiting Logistics",
    color: "bg-teal-500",
  },
  {
    value: "TRACKING_ASSOCIADO",
    label: "Tracking Associated",
    color: "bg-indigo-500",
  },
  {
    value: "AGUARDANDO_EMBARQUE",
    label: "Await Shipment",
    color: "bg-orange-500",
  },
];

// Status translation map for Portuguese to English
const STATUS_TRANSLATIONS: Record<
  string,
  { en: string; pt: string; description: string }
> = {
  AGUARDANDO_LOGISTICA: {
    en: "Awaiting Logistics",
    pt: "AGUARDANDO_LOGISTICA",
    description: "Pedido criado, aguardando criação de remessa",
  },
  TRACKING_ASSOCIADO: {
    en: "Tracking Associated",
    pt: "TRACKING_ASSOCIADO",
    description: "Tracking number associado",
  },
  AGUARDANDO_EMBARQUE: {
    en: "Awaiting Shipment",
    pt: "AGUARDANDO_EMBARQUE",
    description: "CN35 e CN38 criados, aguardando embarque",
  },
};

export default function OrderManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  console.log(orders);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectable, setSelectable] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // desc = newest first, asc = oldest first
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    orderId: string;
    currentStatus: string;
    newStatus: string;
    orderDetails?: Order;
  }>({
    isOpen: false,
    orderId: "",
    currentStatus: "",
    newStatus: "",
  });
  const [infoDialog, setInfoDialog] = useState<{
    isOpen: boolean;
    order?: Order;
    items?: Product[];
    isLoadingItems?: boolean;
  }>({
    isOpen: false,
  });

  // Check for existing authentication session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsAuthLoading(false);
      }
    }
    
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError("");
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: passwordInput,
      });

      if (error) {
        setAuthError(error.message);
        setPasswordInput("");
      } else if (data.session) {
        setIsAuthenticated(true);
        setAuthError("");
      }
    } catch (error) {
      console.error("Login error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setEmail("");
      setPasswordInput("");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Transform Supabase order to Order type
  const transformSupabaseOrder = (supabaseOrder: SupabaseOrder): Order => {
    return {
      id: supabaseOrder.id,
      customer: supabaseOrder.customer_name,
      email: supabaseOrder.address_json?.email || "",
      products: [], // Will be fetched from Shopify later
      amount: Number(supabaseOrder.total_value),
      currency: supabaseOrder.currency || "USD",
      status:
        supabaseOrder.status_logistico.toLowerCase().replace(/_/g, "-") ||
        "pending",
      date: supabaseOrder.created_at,
      shopify_order_id: supabaseOrder.shopify_order_id,
      status_logistico: supabaseOrder.status_logistico,
      total_weight: Number(supabaseOrder.total_weight) || 0,
    };
  };

  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching orders:", error);
          return;
        }

        console.log("Orders from Supabase:", data);

        if (data) {
          // Transform Supabase orders to Order type
          const transformedOrders = data.map((order: SupabaseOrder) =>
            transformSupabaseOrder(order)
          );
          setOrders(transformedOrders);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    }

    fetchOrders();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateFull = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.shopify_order_id &&
          order.shopify_order_id
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        order.products.some((product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus =
        filterStatus === "all" ||
        order.status === filterStatus ||
        order.status_logistico === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort by date
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [orders, searchQuery, filterStatus, sortOrder]);

  const handleStatusChange = (
    orderId: string,
    currentStatus: string,
    newStatus: string
  ) => {
    const order = orders.find((o) => o.id === orderId);
    setConfirmDialog({
      isOpen: true,
      orderId,
      currentStatus,
      newStatus,
      orderDetails: order,
    });
  };

  const updateOrderStatusInSupabase = async (
    orderId: string,
    newStatus: string
  ) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status_logistico: newStatus })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating order status in Supabase:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  const confirmStatusChange = async () => {
    try {
      // Update in Supabase
      await updateOrderStatusInSupabase(
        confirmDialog.orderId,
        confirmDialog.newStatus
      );

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === confirmDialog.orderId
            ? {
                ...order,
                status: confirmDialog.newStatus,
                status_logistico: confirmDialog.newStatus,
              }
            : order
        )
      );

      // Close dialog
      setConfirmDialog({
        isOpen: false,
        orderId: "",
        currentStatus: "",
        newStatus: "",
      });
    } catch (error) {
      console.error("Failed to update order status:", error);
      // You might want to show an error toast/notification here
      alert("Failed to update order status. Please try again.");
    }
  };

  const cancelStatusChange = () => {
    setConfirmDialog({
      isOpen: false,
      orderId: "",
      currentStatus: "",
      newStatus: "",
    });
  };

  const fetchOrderItems = async (
    orderId: string,
    shopifyOrderId?: string
  ): Promise<Product[]> => {
    try {
      console.log(
        "Fetching order items for order ID:",
        orderId,
        "Shopify Order ID:",
        shopifyOrderId
      );

      let data = null;
      let error = null;

      // Try order_internal_id first (UUID to UUID match)
      const resultByInternalId = await supabase
        .from("order_items")
        .select("*")
        .eq("order_internal_id", orderId);

      console.log("Query by order_internal_id:", {
        hasError: !!resultByInternalId.error,
        errorMessage: resultByInternalId.error?.message,
        dataLength: resultByInternalId.data?.length || 0,
      });

      if (
        !resultByInternalId.error &&
        resultByInternalId.data &&
        resultByInternalId.data.length > 0
      ) {
        data = resultByInternalId.data;
        console.log(`✓ Found ${data.length} items using order_internal_id`);
      } else {
        // Try order_id with shopify_order_id (bigint match)
        if (shopifyOrderId) {
          const shopifyOrderIdNum = Number(shopifyOrderId);
          if (!isNaN(shopifyOrderIdNum)) {
            const resultByOrderId = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", shopifyOrderIdNum);

            console.log("Query by order_id (bigint):", {
              hasError: !!resultByOrderId.error,
              errorMessage: resultByOrderId.error?.message,
              dataLength: resultByOrderId.data?.length || 0,
              shopifyOrderIdNum,
            });

            if (
              !resultByOrderId.error &&
              resultByOrderId.data &&
              resultByOrderId.data.length > 0
            ) {
              data = resultByOrderId.data;
              console.log(
                `✓ Found ${data.length} items using order_id (bigint)`
              );
            } else {
              error = resultByOrderId.error;
            }
          }
        }
      }

      // If no data found
      if (!data || data.length === 0) {
        console.warn("⚠ No order items found");
        console.warn("Tried order_internal_id:", orderId);
        if (shopifyOrderId) {
          console.warn("Tried order_id:", Number(shopifyOrderId));
        }
        if (error) {
          console.error("Error:", error);
        }
        return [];
      }

      // Transform Supabase order items to Product type
      const items = (data || []).map((item: any) => {
        // Combine title and variant_title for product name
        const productName = item.variant_title
          ? `${item.title} - ${item.variant_title}`
          : item.title || "Unknown Product";

        const transformed = {
          name: productName,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
        };
        console.log("Transformed item:", item, "→", transformed);
        return transformed;
      });

      console.log(`✓ Successfully transformed ${items.length} items`);
      return items;
    } catch (error) {
      console.error("❌ Exception fetching order items:", error);
      return [];
    }
  };

  const openOrderInfo = async (order: Order) => {
    setInfoDialog({
      isOpen: true,
      order,
      items: [],
      isLoadingItems: true,
    });

    // Fetch order items - try both order_internal_id (UUID) and order_id (bigint)
    const items = await fetchOrderItems(order.id, order.shopify_order_id);
    setInfoDialog((prev) => ({
      ...prev,
      items,
      isLoadingItems: false,
    }));
  };

  const handlePrintShippingLabel = (order: Order) => {
    printShippingLabel({
      tracking_number: `BR${order.id}BR`,
      cn35_number: `CN35${order.id}`,
      sender_name: "Empresa Remetente LTDA",
      sender_country: "Brazil",
      recipient_name: order.customer,
      recipient_address: {
        street: "Rua Example",
        number: "123",
        complement: "Apto 1",
        district: "Centro",
        city: "São Paulo",
        state: "SP",
        postal_code: "01234-567",
        country: "Brazil",
      },
    });
  };

  const handlePrintCustomsDocuments = async (order: Order) => {
    // Fetch order items if not already loaded
    let items = order.products;
    if (!items || items.length === 0) {
      items = await fetchOrderItems(order.id, order.shopify_order_id);
    }

    printCustomsDocuments({
      cn35_number: `CN35${order.id}`,
      tracking_number: `BR${order.id}BR`,
      sender: {
        name: "Empresa Remetente LTDA",
        address: "Av. Paulista, 1000 - São Paulo, SP - Brazil",
        country: "Brazil",
      },
      recipient: {
        name: order.customer,
        address: "Endereço do destinatário",
        country: "Brazil",
      },
      customs_contents: items.map((product) => ({
        description: product.name,
        quantity: product.quantity,
        unit_value: product.price,
        currency: order.currency || "USD",
      })),
      total_declared_value: order.amount,
      total_weight_kg: order.total_weight || 0.5,
      shipment_purpose: "Sale",
      country_of_origin: "Brazil",
      creation_timestamp: new Date().toISOString(),
    });
  };

  const getStatusBadge = (status: string) => {
    // Check if it's a Portuguese status that needs translation
    const statusTranslation = STATUS_TRANSLATIONS[status];

    if (statusTranslation) {
      // Find the color from ORDER_STATUSES
      const statusConfig = ORDER_STATUSES.find((s) => s.value === status);
      const color = statusConfig?.color || "bg-gray-500";

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={`${color} text-white border-0 cursor-help`}
            >
              {statusTranslation.en}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{statusTranslation.pt}</p>
              <p className="text-sm">{statusTranslation.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Fallback for other statuses
    const normalizedStatus = status.toLowerCase().replace(/_/g, "-");
    const statusConfig = ORDER_STATUSES.find(
      (s) => s.value === normalizedStatus || s.value === status
    );

    if (!statusConfig) {
      return (
        <Badge variant="secondary" className="bg-gray-500 text-white border-0">
          {status.replace(/_/g, " ")}
        </Badge>
      );
    }

    return (
      <Badge
        variant="secondary"
        className={`${statusConfig.color} text-white border-0`}
      >
        {statusConfig.label}
      </Badge>
    );
  };

  const getStatusLabel = (status: string) => {
    return ORDER_STATUSES.find((s) => s.value === status)?.label || status;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }

      if (data) {
        const transformedOrders = data.map((order: SupabaseOrder) =>
          transformSupabaseOrder(order)
        );
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          <div className="bg-card border rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Package className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold">Backoffice</h1>
            </div>
            <p className="text-center text-muted-foreground mb-8">
              Sign in to access the order management system
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAuthError("");
                    }}
                    disabled={isLoggingIn}
                    autoFocus
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setAuthError("");
                    }}
                    disabled={isLoggingIn}
                  />
                </div>
                {authError && (
                  <p className="text-red-500 text-sm">
                    {authError}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TooltipProvider>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-balance">
                Order Management
              </h1>
            </div>
            <p className="text-muted-foreground">
              Track and manage order statuses throughout the delivery process
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center flex-1">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders, customers, products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() =>
                      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                    }
                    variant="outline"
                    className="w-full md:w-auto"
                  >
                    {sortOrder === "desc" ? (
                      <>
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Newest First
                      </>
                    ) : (
                      <>
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Oldest First
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Sort by date:{" "}
                    {sortOrder === "desc"
                      ? "Newest to Oldest"
                      : "Oldest to Newest"}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Button variant="outline"> Flight </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
              >
                Logout
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Order ID</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Currency</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                  <TableHead className="font-semibold">Print</TableHead>
                  <TableHead className="font-semibold">Info</TableHead>
                  <TableHead className="font-semibold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">No orders found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{order.shopify_order_id || order.id}</span>
                          {order.shopify_order_id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() =>
                                    copyToClipboard(order.id, order.id)
                                  }
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                >
                                  {copiedId === order.id ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      <span>Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>ID: {order.id.slice(0, 8)}...</span>
                                    </>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to copy UUID</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customer}</span>
                          {order.email && (
                            <span className="text-sm text-muted-foreground">
                              {order.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatAmount(order.amount, order.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {order.currency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {formatDate(order.date)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatDateFull(order.date)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status_logistico || order.status)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status_logistico || order.status}
                          onValueChange={(value) =>
                            handleStatusChange(
                              order.id,
                              order.status_logistico || order.status,
                              value
                            )
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((status) => (
                              <SelectItem
                                key={status.value}
                                value={status.value}
                              >
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  window.open(`/unitizer/${order.id}`, "_blank")
                                }
                                className="h-8 w-8"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Print Unitizer Label</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  window.open(`/cn38/${order.id}`, "_blank")
                                }
                                className="h-8 w-8"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Print Customs Documents</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openOrderInfo(order)}
                              className="h-8 w-8"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Information</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                window.open(`/order/${order.id}`, "_blank")
                              }
                              className="h-8 w-8"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open in New Tab</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="mt-6 text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.isOpen}
          onOpenChange={(open) => !open && cancelStatusChange()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Confirm Status Change
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to change the order status? This action
                will update the order tracking.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Order ID:</span>
                <span className="text-sm">{confirmDialog.orderId}</span>
              </div>
              {confirmDialog.orderDetails && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">
                      {confirmDialog.orderDetails.customer}
                    </span>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <span className="text-sm font-medium block mb-2">
                      Products:
                    </span>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {confirmDialog.orderDetails.products.map(
                        (product, index) => (
                          <li key={index}>
                            {product.name} (x{product.quantity})
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Status Change:</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(confirmDialog.currentStatus)}
                  <span className="text-muted-foreground">→</span>
                  {getStatusBadge(confirmDialog.newStatus)}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={cancelStatusChange}>
                Cancel
              </Button>
              <Button onClick={confirmStatusChange}>Confirm Change</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Dialog */}
        <Dialog
          open={infoDialog.isOpen}
          onOpenChange={(open) =>
            setInfoDialog({
              isOpen: open,
              items: undefined,
              isLoadingItems: false,
            })
          }
        >
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Order Information
              </DialogTitle>
              <DialogDescription>
                Complete details for this order
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 pr-2 -mr-2">
              {infoDialog.order && (
                <div className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Order ID
                      </p>
                      <p className="text-base font-semibold">
                        {infoDialog.order.shopify_order_id ||
                          infoDialog.order.id}
                      </p>
                      {infoDialog.order.shopify_order_id && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  infoDialog.order!.id,
                                  infoDialog.order!.id
                                )
                              }
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                              {copiedId === infoDialog.order.id ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>UUID Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>UUID: {infoDialog.order.id}</span>
                                </>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Click to copy UUID</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <div>
                        {getStatusBadge(
                          infoDialog.order.status_logistico ||
                            infoDialog.order.status
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Name
                        </p>
                        <p className="text-base">{infoDialog.order.customer}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Email
                        </p>
                        <p className="text-base">{infoDialog.order.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h3 className="font-semibold">
                      Products ({infoDialog.items?.length || 0})
                    </h3>
                    {infoDialog.isLoadingItems ? (
                      <div className="bg-muted p-4 rounded-md text-center">
                        <p className="text-sm text-muted-foreground">
                          Loading products...
                        </p>
                      </div>
                    ) : !infoDialog.items || infoDialog.items.length === 0 ? (
                      <div className="bg-muted p-4 rounded-md text-center">
                        <p className="text-sm text-muted-foreground">
                          No products found for this order.
                        </p>
                        {infoDialog.order.shopify_order_id && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Shopify Order ID:{" "}
                            {infoDialog.order.shopify_order_id}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {infoDialog.items.map((product, index) => (
                          <div key={index} className="bg-muted p-4 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium">{product.name}</p>
                              <Badge variant="outline">
                                x{product.quantity}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Unit Price
                              </p>
                              <p className="text-sm font-medium">
                                {formatAmount(
                                  product.price,
                                  infoDialog.order?.currency || "USD"
                                )}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-muted-foreground">
                                Subtotal
                              </p>
                              <p className="text-sm font-semibold">
                                {formatAmount(
                                  product.price * product.quantity,
                                  infoDialog.order?.currency || "USD"
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-primary/10 p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold">Total Amount</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold">
                            {formatAmount(
                              infoDialog.order.amount,
                              infoDialog.order.currency
                            )}
                          </p>
                          <Badge variant="outline" className="font-mono">
                            {infoDialog.order.currency}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-muted-foreground">
                          Order Date
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm cursor-help">
                              {formatDate(infoDialog.order.date)}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatDateFull(infoDialog.order.date)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setInfoDialog({ isOpen: false })}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}
