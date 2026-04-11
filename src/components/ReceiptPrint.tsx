import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useReceiptData(orderId: string) {
  return useQuery({
    queryKey: ["receipt", orderId],
    queryFn: async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("id", orderId)
        .single();

      const { data: items } = await supabase
        .from("order_items")
        .select("*, products(name)")
        .eq("order_id", orderId);

      const { data: settings } = await supabase
        .from("store_settings")
        .select("key, value");

      const storeConfig: Record<string, string> = {};
      settings?.forEach((s: any) => { storeConfig[s.key] = s.value || ""; });

      return { order, items: items || [], store: storeConfig };
    },
    enabled: !!orderId,
  });
}

export function printReceipt(order: any, items: any[], store: Record<string, string>) {
  const currency = store.currency_symbol || "৳";
  const win = window.open("", "_blank");
  if (!win) return;

  const itemRows = items
    .map(
      (i: any) =>
        `<tr><td>${i.products?.name || "Item"}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${currency}${Number(i.unit_price).toFixed(2)}</td><td style="text-align:right">${currency}${Number(i.total_price).toFixed(2)}</td></tr>`
    )
    .join("");

  win.document.write(`<!DOCTYPE html><html><head><title>রসিদ - Receipt</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Courier New',monospace;width:300px;margin:0 auto;padding:10px;font-size:12px;}
      .center{text-align:center;}
      .bold{font-weight:bold;}
      .line{border-top:1px dashed #000;margin:6px 0;}
      table{width:100%;border-collapse:collapse;}
      td,th{padding:2px 0;font-size:11px;}
      .right{text-align:right;}
      .footer{margin-top:10px;text-align:center;font-size:10px;}
      .license{font-size:9px;color:#666;margin-top:4px;}
    </style>
  </head><body>
    ${store.store_logo ? `<div class="center"><img src="${store.store_logo}" style="max-height:50px;max-width:120px;margin-bottom:4px;" /></div>` : ""}
    <div class="center bold" style="font-size:16px;">${store.store_name || "MediShop"}</div>
    ${store.store_tagline ? `<div class="center" style="font-size:10px;">${store.store_tagline}</div>` : ""}
    ${store.store_address ? `<div class="center" style="font-size:10px;">${store.store_address}</div>` : ""}
    ${store.store_phone ? `<div class="center" style="font-size:10px;">ফোন: ${store.store_phone}</div>` : ""}
    ${store.drug_license_no ? `<div class="center license">ড্রাগ লাইসেন্স: ${store.drug_license_no}</div>` : ""}
    <div class="line"></div>
    <div>অর্ডার: ${order.order_number}</div>
    <div>তারিখ: ${new Date(order.created_at).toLocaleString("bn-BD")}</div>
    ${order.customers?.name ? `<div>গ্রাহক: ${order.customers.name}</div>` : ""}
    ${order.customers?.phone ? `<div>ফোন: ${order.customers.phone}</div>` : ""}
    <div>পেমেন্ট: ${order.payment_method || "নগদ"}</div>
    <div class="line"></div>
    <table>
      <tr class="bold"><th style="text-align:left">পণ্য</th><th>পরি.</th><th style="text-align:right">মূল্য</th><th style="text-align:right">মোট</th></tr>
      ${itemRows}
    </table>
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between;"><span>সাবটোটাল</span><span>${currency}${Number(order.subtotal).toFixed(2)}</span></div>
    ${Number(order.discount) > 0 ? `<div style="display:flex;justify-content:space-between;"><span>ছাড়</span><span>-${currency}${Number(order.discount).toFixed(2)}</span></div>` : ""}
    ${Number(order.tax) > 0 ? `<div style="display:flex;justify-content:space-between;"><span>ভ্যাট</span><span>${currency}${Number(order.tax).toFixed(2)}</span></div>` : ""}
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between;" class="bold"><span>সর্বমোট</span><span>${currency}${Number(order.total).toFixed(2)}</span></div>
    <div class="line"></div>
    <div class="footer">${store.receipt_footer || "ধন্যবাদ! আবার আসবেন।"}</div>
    <div class="footer" style="margin-top:6px;font-size:9px;">Powered by MediShop POS</div>
    <script>window.print();window.close();</script>
  </body></html>`);
}
