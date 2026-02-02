/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price: salePrice } = _product;
    const { quantity, discount = 0 } = purchase;
    const discountFactor = 1 - (discount / 100);
    return salePrice * quantity * discountFactor;
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

    // Подготовка статистики
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        sales_count: 0,
        revenue: 0,
        profit: 0,
        totalProfit: 0,
        bonus: 0,
        productsSold: {}
    }));

    // Индексация
    const sellerIndex = Object.fromEntries(
        sellerStats.map(s => [s.seller_id, s])
    );
    const productIndex = Object.fromEntries(
        data.products.map(p => [p.sku, p])
    );

    // Обработка чеков
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;

            seller.totalProfit += profit;

            if (!seller.productsSold[item.sku]) {
                seller.productsSold[item.sku] = 0;
            }
            seller.productsSold[item.sku] += item.quantity;
        });
    });

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.totalProfit - a.totalProfit);

    // Назначение бонусов и топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        seller.top_products = Object.entries(seller.productsSold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формирование результата
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        sales_count: seller.sales_count,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.totalProfit.toFixed(2),
        bonus: +seller.bonus.toFixed(2),
        top_products: seller.top_products
    }));
}
