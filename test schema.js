// schema.ts
import { list } from '@keystone-6/core';
import { allowAll } from '@keystone-6/core/access';
import { text, relationship, integer, password, checkbox, timestamp, image } from '@keystone-6/core/fields';
import { Lists } from '.keystone/types';
// import { type Lists } from '.keystone/types';

export const Lists = {
  // export const lists: Lists = {
  User: list({
    access: allowAll,
    fields: {
      clerkId: text({ isIndexed: 'unique', isFilterable: true }),
      name: text({ validation: { isRequired: true } }),
      email: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
      password: password(),
      isAdmin: checkbox({ defaultValue: false }),
      orders: relationship({ ref: 'Order.user', many: true }),
      wishlistItems: relationship({ ref: 'WishlistItem.user', many: true }),
      addresses: relationship({ ref: 'Address.user', many: true }),
      createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
    db: {
    idField: { kind: 'uuid' },
  },
  }),

  Product: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      description: text(),
      price: integer({ validation: { isRequired: true } }),
      stock: integer({ defaultValue: 0 }),
      image: image({ storage: 'my_images' }),
      category: relationship({ ref: 'Category.products' }),
      orderItems: relationship({ ref: 'OrderItem.product', many: true }),
      wishlistItems: relationship({ ref: 'WishlistItem.product', many: true }),
    },
  }),

  Category: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      products: relationship({ ref: 'Product.category', many: true }),
    },
  }),

  Order: list({
    access: allowAll,
    fields: {
      orderNumber: text({ isIndexed: 'unique' }),
      totalAmount: integer({ validation: { isRequired: true } }),
      status: text({ defaultValue: 'pending' }),
      paymentMethod: text({ defaultValue: 'stripe' }),
      paymentStatus: text({ defaultValue: 'pending' }),
      paymentReference: text(), // ✅ ADD THIS LINE - stores Paystack/Stripe reference
      user: relationship({ ref: 'User.orders' }),
      items: relationship({ ref: 'OrderItem.order', many: true }),
      shippingAddress: relationship({ ref: 'ShippingAddress.order' }),
      createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
  }),

  OrderItem: list({
    access: allowAll,
    fields: {
      order: relationship({ ref: 'Order.items' }),
      product: relationship({ ref: 'Product.orderItems' }),
      quantity: integer({ validation: { isRequired: true } }),
      price: integer({ validation: { isRequired: true } }),
    },
  }),

  ShippingAddress: list({
    access: allowAll,
    fields: {
      order: relationship({ ref: 'Order.shippingAddress' }),
      fullName: text({ validation: { isRequired: true } }),
      phone: text({ validation: { isRequired: true } }),
      address: text({ validation: { isRequired: true } }),
      city: text({ validation: { isRequired: true } }),
      state: text({ validation: { isRequired: true } }),
      postalCode: text({ validation: { isRequired: true } }),
      country: text({ validation: { isRequired: true } }),
    },
  }),

  WishlistItem: list({
    access: allowAll,
    fields: {
      user: relationship({ ref: 'User.wishlistItems' }),
      product: relationship({ ref: 'Product.wishlistItems' }),
      addedAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
  }),

  Address: list({
    access: allowAll,
    fields: {
      user: relationship({ ref: 'User.addresses' }),
      fullName: text({ validation: { isRequired: true } }),
      phone: text({ validation: { isRequired: true } }),
      address: text({ validation: { isRequired: true } }),
      city: text({ validation: { isRequired: true } }),
      state: text({ validation: { isRequired: true } }),
      postalCode: text({ validation: { isRequired: true } }),
      country: text({ validation: { isRequired: true }, defaultValue: 'Nigeria' }),
      isDefault: checkbox({ defaultValue: false }),
      createdAt: timestamp({ defaultValue: { kind: 'now' } }),
    },
  }),
};