"use client"

import React, { useState, useMemo } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { MOVIE_CATEGORIES, FLAT_CATEGORIES, CATEGORY_COLOR_STYLES } from "@/lib/config/categories"

export function CategorySelector({ value, onChange, customValue, onCustomChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedCategory = useMemo(() => {
    return FLAT_CATEGORIES.find((c) => c.id === value)
  }, [value])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return MOVIE_CATEGORIES

    const term = search.toLowerCase()
    return MOVIE_CATEGORIES.map((group) => {
      const filteredItems = group.items.filter((item) =>
        item.label.toLowerCase().includes(term)
      )
      return { ...group, items: filteredItems }
    }).filter((group) => group.items.length > 0)
  }, [search])

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <Label>Category</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedCategory ? (
                <div className="flex items-center gap-2">
                  <span className="truncate">{selectedCategory.label}</span>
                  {selectedCategory.color && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2 font-normal rounded-sm py-0 h-5",
                        CATEGORY_COLOR_STYLES[selectedCategory.color] || CATEGORY_COLOR_STYLES.gray
                      )}
                    >
                      {selectedCategory.group}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Select a category...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] md:w-[450px] p-0" align="start">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredCategories.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No categories found.
                </p>
              ) : (
                filteredCategories.map((group) => (
                  <div key={group.group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover/95 backdrop-blur z-10">
                      {group.group}
                    </div>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onChange(item.id)
                          setOpen(false)
                          setSearch("")
                        }}
                        className={cn(
                          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                          value === item.id ? "bg-accent text-accent-foreground" : ""
                        )}
                      >
                        {value === item.id && (
                          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                        <span className="flex-1">{item.label}</span>
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full ml-auto",
                            CATEGORY_COLOR_STYLES[group.color]?.split(" ")[1] // extracts the text color to use as background if possible, or just standard bg
                          )}
                          style={{
                            backgroundColor: `var(--${group.color}-500, currentColor)`
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {value === "other" && (
        <div className="flex flex-col space-y-2 animate-in fade-in zoom-in duration-200">
          <Label htmlFor="custom-category">Custom Category</Label>
          <Input
            id="custom-category"
            placeholder="e.g. Soundtrack Analysis"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}
