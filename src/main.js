/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет прибыли от операции
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase;
  const discountAmount = sale_price * (discount / 100);
  const finalPrice = sale_price - discountAmount;
  return finalPrice * quantity;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return profit * 0.05;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;
  if (
    !data ||
  !Array.isArray(data.sellers) || data.sellers.length === 0 ||
  !Array.isArray(data.products) || data.products.length === 0 ||
  !Array.isArray(data.purchase_records) 
  
  ) {
    throw new Error("Некорректные входные данные");
  }

  if (
    typeof options?.calculateRevenue !== "function" ||
    typeof options?.calculateBonus !== "function"
  ) {
    throw new Error("Не переданы обязательные функции для расчетов");
  }

  const sellersStats = {};
  data.sellers.forEach((seller) => {
    sellersStats[seller.id] = {
      seller_id: seller.id,
      name: `${seller.first_name} ${seller.last_name}`,
      revenue: 0,
      profit: 0,
      sales_count: 0,
      products_sold: {},
    };
  });

  const sellerIndex = {};
  data.sellers.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });
  const productIndex = {};
  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  data.purchase_records.forEach((record) => {
  const sellerStat = sellersStats[record.seller_id];
  if (!sellerStat) return;

  sellerStat.sales_count += 1;
  sellerStat.revenue += record.total_amount; // ← Только из total_amount

  record.items.forEach((item) => {
    const product = productIndex[item.sku];
    if (!product) {
      console.warn(`Товар с SKU ${item.sku} не найден`);
      return;
    }

    const purchasePrice = product.purchase_price || 0;
    const salePrice = item.sale_price || 0;
    const quantity = Number(item.quantity) || 0;
    const discount = item.discount || 0;

    const finalPrice = salePrice * (1 - discount / 100);
    const itemRevenue = finalPrice * quantity;
    const itemCost = purchasePrice * quantity;
    const itemProfit = itemRevenue - itemCost;

    sellerStat.profit += itemProfit;

    if (!sellerStat.products_sold[item.sku]) {
      sellerStat.products_sold[item.sku] = 0;
    }
    sellerStat.products_sold[item.sku] += quantity;
  });
});
  const sortedSellers = Object.values(sellersStats).sort(
    (a, b) => b.profit - a.profit
  );
  const totalSellers = sortedSellers.length;

  sortedSellers.forEach((seller, index) => {
    seller.bonus = options.calculateBonus(index, totalSellers, seller);
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });
  return sortedSellers.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}