import moment from 'moment';

// Format tiền tệ Việt Nam (100000 -> 100.000 đ)
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
};

// Format ngày tháng (2025-10-10 -> 10/10/2025 14:30)
export const formatDate = (date) => {
    if (!date) return '';
    return moment(date).format('DD/MM/YYYY HH:mm');
};