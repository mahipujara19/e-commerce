import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchProduct,
  fetchProductList,
  fetchProductsByIds,
  fetchProductStats,
  fetchProductSummary,
  listKey,
} from '../toolkit/productSlice'

// A cached list or summary older than this is reloaded the next time a screen asks for it.
const STALE_MS = 60 * 1000

const isFresh = (entry, version) =>
  Boolean(entry) && entry.status === 'succeeded' && entry.version === version && Date.now() - entry.fetchedAt < STALE_MS

/**
 * One page of products from the API. params: { page, pageSize, sort, category, categories, search, ids, stock }.
 * While another page loads, the previous page's products stay on screen (placeholder: true) so the grid does not
 * flash empty. Returns { products, total, totalPages, page, loading, placeholder, error, refetch }.
 */
export function useProductList(params, { enabled = true } = {}) {
  const dispatch = useDispatch()
  const key = listKey(params)
  const list = useSelector((state) => state.products.lists[key])
  const version = useSelector((state) => state.products.version)
  const byId = useSelector((state) => state.products.byId)

  useEffect(() => {
    if (!enabled || list?.status === 'loading' || isFresh(list, version)) return
    dispatch(fetchProductList(Object.fromEntries(JSON.parse(key))))
    // `list` is read, not watched: a list that just loaded or failed must not trigger another request by itself.
  }, [dispatch, key, version, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => dispatch(fetchProductList(Object.fromEntries(JSON.parse(key)))), [dispatch, key])

  const current = useMemo(
    () => (list?.status === 'succeeded' || list?.ids.length ? list.ids.map((id) => byId[id]).filter(Boolean) : null),
    [list, byId],
  )

  // The last page this hook showed, kept while the next one loads. Updated during render (React's pattern for
  // state derived from props); the identity checks stop it from looping.
  const [previous, setPrevious] = useState({ list: null, products: [], total: 0, totalPages: 1 })
  if (current && list?.status === 'succeeded' && (previous.list !== list || previous.products !== current)) {
    setPrevious({ list, products: current, total: list.total, totalPages: list.totalPages })
  }

  const loading = enabled && (!list || list.status === 'loading')
  const placeholder = !current && loading && previous.products.length > 0

  return {
    products: current ?? (placeholder ? previous.products : []),
    total: list?.status === 'succeeded' ? list.total : previous.total,
    totalPages: list?.status === 'succeeded' ? list.totalPages : previous.totalPages,
    page: list?.page ?? params.page ?? 1,
    loading,
    placeholder,
    error: list?.status === 'failed' ? list.error : null,
    refetch,
  }
}

/**
 * Specific products by id, in the order given, e.g. a wishlist. Deleted products are left out.
 * Fetched whenever the set of ids changes. Returns { products, loading, error, refetch }.
 */
export function useProductsByIds(ids, { enabled = true } = {}) {
  const dispatch = useDispatch()
  const byId = useSelector((state) => state.products.byId)
  const key = useMemo(() => [...new Set(ids)].sort().join(','), [ids])
  // The ids last answered, and the error if that answer failed. Only set when a request finishes, so this set of
  // ids counts as loading until its own response arrives.
  const [settled, setSettled] = useState({ key: null, error: null })

  const request = useCallback(() => {
    if (!key) return
    dispatch(fetchProductsByIds(key.split(',')))
      .unwrap()
      .then(() => setSettled({ key, error: null }))
      .catch((error) => setSettled({ key, error }))
  }, [dispatch, key])

  useEffect(() => {
    if (enabled) request()
  }, [enabled, request])

  const refetch = useCallback(() => {
    setSettled({ key: null, error: null })
    request()
  }, [request])

  const products = useMemo(() => ids.map((id) => byId[id]).filter(Boolean), [ids, byId])

  return {
    products,
    loading: enabled && key !== '' && settled.key !== key,
    error: settled.key === key ? settled.error : null,
    refetch,
  }
}

/**
 * One product, e.g. its own page. A copy already in the cache shows straight away and is refreshed in the
 * background so stock and price are current. Returns { product, loading, notFound, error, refetch }.
 */
export function useProduct(id) {
  const dispatch = useDispatch()
  const product = useSelector((state) => (id ? state.products.byId[id] : undefined))
  const notFound = useSelector((state) => Boolean(id && state.products.missing[id]))
  // The id last answered and its error, set only when a request finishes (see useProductsByIds).
  const [settled, setSettled] = useState({ id: null, error: null })

  const request = useCallback(() => {
    if (!id) return
    dispatch(fetchProduct(id))
      .unwrap()
      .then(() => setSettled({ id, error: null }))
      .catch((error) => setSettled({ id, error }))
  }, [dispatch, id])

  useEffect(request, [request])

  const refetch = useCallback(() => {
    setSettled({ id: null, error: null })
    request()
  }, [request])

  return {
    product,
    loading: !product && !notFound && settled.id !== id,
    notFound: notFound && !product,
    error: !product && !notFound && settled.id === id ? settled.error : null,
    refetch,
  }
}

const useCachedResource = (selector, thunk, { enabled = true } = {}) => {
  const dispatch = useDispatch()
  const resource = useSelector(selector)
  const version = useSelector((state) => state.products.version)

  useEffect(() => {
    if (!enabled || resource.status === 'loading') return
    if (resource.status === 'succeeded' && resource.version === version) return
    dispatch(thunk())
    // Reloads when products are added, removed or sold; `resource` is read, not watched.
  }, [dispatch, version, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => dispatch(thunk()), [dispatch, thunk])
  return { data: resource.data, loading: enabled && !resource.data && resource.status !== 'failed', error: resource.error, refetch }
}

// Catalogue-wide figures: { total, averageRating, categories: [{ name, count, image }] }.
export const useProductSummary = (options) => useCachedResource((state) => state.products.summary, fetchProductSummary, options)

// Staff only: { total, units, value, low, out, lowStockThreshold }.
export const useProductStats = (options) => useCachedResource((state) => state.products.stats, fetchProductStats, options)
