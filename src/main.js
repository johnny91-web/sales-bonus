/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
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
    const { totalProfit } = seller;

    if (index === 0) {
        return totalProfit * 0.15; // 15% — лидер
    } else if (index === 1 || index === 2) {
        return totalProfit * 0.10; // 10% — 2-е и 3-е место
    } else if (index === total - 1) {
        return 0; // последний — без бонуса
    } else {
        return totalProfit * 0.05; // 5% — остальные
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций
    if (typeof options !== 'object' || options === null) {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Отсутствуют необходимые функции в опциях');
    }

    // Подготовка статистики по продавцам
    const sellersStats = {};
    data.sellers.forEach(seller => {
        sellersStats[seller.id] = {
            seller_id: seller.id,
            name: seller.name,
            sales_count: 0,
            revenue: 0,
            profit: 0,
            totalProfit: 0,
            bonus: 0,
            products_sold: {}
        };
    });

    // Индексация товаров
    const productIndex = Object.fromEntries(
        data.products.map(p => [p.sku, p])
    );

    // Обработка чеков
    data.purchase_records.forEach(record => {
        const sellerStat = sellersStats[record.seller_id];
        if (!sellerStat) return; // Продавец не найден

        sellerStat.sales_count += 1;
        sellerStat.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const itemCost = product.purchase_price * item.quantity;
            const itemRevenue = calculateRevenue(item, product);
            const itemProfit = itemRevenue - itemCost;

            sellerStat.totalProfit += itemProfit;

            if (!sellerStat.products_sold[item.sku]) {
                sellerStat.products_sold[item.sku] = 0;
            }
            sellerStat.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка по прибыли
    const sortedSellers = Object.values(sellersStats).sort((a, b) => b.totalProfit - a.totalProfit);
    const totalSellers = sortedSellers.length;

    // Назначение бонусов и топ-10 товаров
    sortedSellers.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формирование результата
    return sortedSellers.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        sales_count: seller.sales_count,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.totalProfit.toFixed(2),
        bonus: +seller.bonus.toFixed(2),
        top_products: seller.top_products
    }));
}
