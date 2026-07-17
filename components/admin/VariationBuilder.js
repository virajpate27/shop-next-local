// src/components/admin/VariationBuilder.js
'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Upload, Loader2 } from 'lucide-react'
import { uid, DISPLAY_TYPES, generateVariants } from '@/utils/variations'
import { uploadImage } from '@/lib/cloudinary'

export function VariationBuilder({ variationTypes, setVariationTypes, variants, setVariants, basePrice }) {
  const [expandedType, setExpandedType] = useState(null)
  const [uploadingOptionId, setUploadingOptionId] = useState(null)
  const fileRefs = useRef({})

  // ── Variation type actions ────────────────────────────────────────────
  function addType() {
    const newType = { id: uid(), name: '', displayType: 'button', options: [] }
    setVariationTypes((prev) => [...prev, newType])
    setExpandedType(newType.id)
  }

  function updateType(typeId, field, value) {
    setVariationTypes((prev) =>
      prev.map((t) => t.id === typeId ? { ...t, [field]: value } : t)
    )
  }

  function removeType(typeId) {
    const updated = variationTypes.filter((t) => t.id !== typeId)
    setVariationTypes(updated)
    regenerateVariants(updated)
  }

  // ── Option actions ────────────────────────────────────────────────────
  function addOption(typeId) {
    setVariationTypes((prev) =>
      prev.map((t) =>
        t.id === typeId
          ? {
              ...t,
              options: [...t.options, {
                id: uid(), label: '', value: '', hex: '', image: ''
              }],
            }
          : t
      )
    )
  }

  function updateOption(typeId, optionId, field, value) {
    setVariationTypes((prev) =>
      prev.map((t) =>
        t.id === typeId
          ? {
              ...t,
              options: t.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : t
      )
    )
  }

  function removeOption(typeId, optionId) {
    const updated = variationTypes.map((t) =>
      t.id === typeId
        ? { ...t, options: t.options.filter((o) => o.id !== optionId) }
        : t
    )
    setVariationTypes(updated)
    regenerateVariants(updated)
  }

  // ── Image upload per option ───────────────────────────────────────────
  async function handleOptionImageUpload(typeId, optionId, file) {
    if (!file) return
    setUploadingOptionId(optionId)
    try {
      const url = await uploadImage(file, 'shopnext/variations')
      updateOption(typeId, optionId, 'image', url)
    } catch {
      alert('Image upload failed. Please try again.')
    } finally {
      setUploadingOptionId(null)
    }
  }

  // ── Variant generation ────────────────────────────────────────────────
  function regenerateVariants(types = variationTypes) {
    const typesWithOptions = types.filter((t) => t.name && t.options.length > 0)
    const generated = generateVariants(typesWithOptions, variants)
    setVariants(generated)
  }

  function updateVariant(variantId, field, value) {
    setVariants((prev) =>
      prev.map((v) => v.id === variantId ? { ...v, [field]: value } : v)
    )
  }

  return (
    <div className="space-y-4">

      {/* Variation types */}
      {variationTypes.map((vType) => (
        <div key={vType.id} className="border border-gray-200 rounded-xl overflow-hidden">

          {/* Type header */}
          <div className="flex items-center gap-3 p-4 bg-gray-50">
            <input
              value={vType.name}
              onChange={(e) => updateType(vType.id, 'name', e.target.value)}
              placeholder="Type name (e.g. Size, Color, Style)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            <select
              value={vType.displayType}
              onChange={(e) => updateType(vType.id, 'displayType', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {DISPLAY_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setExpandedType(expandedType === vType.id ? null : vType.id)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {expandedType === vType.id
                ? <ChevronUp className="w-4 h-4 text-gray-500" />
                : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              type="button"
              onClick={() => removeType(vType.id)}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Options */}
          {expandedType === vType.id && (
            <div className="p-4 space-y-3">
              {vType.options.map((opt) => (
                <div key={opt.id} className="flex items-start gap-2">

                  {/* Image swatch upload */}
                  {vType.displayType === 'image' && (
                    <div className="flex-shrink-0">
                      <input
                        ref={(el) => { fileRefs.current[opt.id] = el }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleOptionImageUpload(vType.id, opt.id, file)
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRefs.current[opt.id]?.click()}
                        disabled={uploadingOptionId === opt.id}
                        className="relative w-14 h-14 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex items-center justify-center overflow-hidden flex-shrink-0"
                      >
                        {uploadingOptionId === opt.id ? (
                          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        ) : opt.image ? (
                          <Image
                            src={opt.image}
                            alt={opt.label || 'Swatch'}
                            fill
                            className="object-cover rounded-xl"
                          />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Color picker */}
                  {vType.displayType === 'color' && (
                    <input
                      type="color"
                      value={opt.hex || '#000000'}
                      onChange={(e) => updateOption(vType.id, opt.id, 'hex', e.target.value)}
                      className="w-10 h-10 mt-0.5 border border-gray-200 rounded-lg cursor-pointer p-0.5 flex-shrink-0"
                    />
                  )}

                  {/* Label + value inputs */}
                  <div className="flex flex-1 gap-2">
                    <input
                      value={opt.label}
                      onChange={(e) => updateOption(vType.id, opt.id, 'label', e.target.value)}
                      placeholder="Label (e.g. Floral, Striped)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      value={opt.value}
                      onChange={(e) => updateOption(vType.id, opt.id, 'value', e.target.value.toLowerCase())}
                      placeholder="Value (e.g. floral)"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeOption(vType.id, opt.id)}
                    className="p-2 mt-0.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addOption(vType.id)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add option
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add type + generate buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addType}
          className="flex items-center gap-2 text-sm text-indigo-600 font-medium border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add variation type
        </button>

        {variationTypes.some((t) => t.name && t.options.length > 0) && (
          <button
            type="button"
            onClick={() => regenerateVariants()}
            className="flex items-center gap-2 text-sm text-gray-600 font-medium border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Generate variants
          </button>
        )}
      </div>

      {/* Variants table */}
      {variants.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {variants.length} variant{variants.length !== 1 ? 's' : ''} — set price and stock for each
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Variant</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">SKU</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Price (₹)</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((variant) => {
                  const label = variationTypes
                    .map((vt) => {
                      const opt = vt.options.find((o) => o.id === variant.combination?.[vt.id])
                      return opt?.label
                    })
                    .filter(Boolean)
                    .join(' / ')

                  return (
                    <tr key={variant.id}>
                      <td className="px-3 py-2 font-medium text-gray-800">{label}</td>
                      <td className="px-3 py-2">
                        <input
                          value={variant.sku}
                          onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                          placeholder="SKU"
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.price}
                          onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                          placeholder={basePrice || '0'}
                          className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => updateVariant(variant.id, 'stock', Number(e.target.value))}
                          className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}