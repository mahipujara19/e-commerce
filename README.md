# Goodthings Storefront

A responsive product storefront built with React, Vite, Material UI, and Redux Toolkit. Products are loaded from the DummyJSON Products API, and cart items are managed in Redux and saved to browser local storage.

## Getting started

### Requirements

- Node.js (a current LTS version is recommended)
- npm

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Features

- Responsive storefront header, product collection, and cart panel
- Product loading, success, and error states
- Product data fetched from `https://dummyjson.com/products`
- Redux Toolkit state for products and cart
- Cart data persisted in browser local storage
- Material UI components and icons

The product API requires an internet connection. If the request fails, the product section displays an error message.

## Project structure

```text
src/
  components/
    Addtocart.jsx       Cart summary
    header.jsx          Storefront header and cart badge
    Product.jsx         Product collection
  toolkit/
    productslice.jsx    Async product request and product state
    slice.js            Cart actions and state
    store.js            Redux store configuration
  App.jsx
  App.css
  index.css
  main.jsx
```
