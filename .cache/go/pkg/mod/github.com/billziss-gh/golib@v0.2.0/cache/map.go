/*
 * map.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package cache provides LRU cache map functionality.
package cache

// MapItem is the data structure that is stored in a Map.
type MapItem struct {
	next, prev *MapItem
	Value      interface{}
}

// Empty initializes the list item as empty.
func (item *MapItem) Empty() {
	item.next = item
	item.prev = item
}

// IsEmpty determines if the list item is empty.
func (item *MapItem) IsEmpty() bool {
	return item.next == item
}

// InsertHead inserts the list item to the head of a list.
func (item *MapItem) InsertHead(list *MapItem) {
	next := list.next
	item.next = next
	item.prev = list
	next.prev = item
	list.next = item
}

// InsertTail inserts the list item to the tail of a list.
func (item *MapItem) InsertTail(list *MapItem) {
	prev := list.prev
	item.next = list
	item.prev = prev
	prev.next = item
	list.prev = item
}

// Remove removes the list item from any list it is in.
func (item *MapItem) Remove() {
	next := item.next
	prev := item.prev
	next.prev = prev
	prev.next = next
}

// Iterate iterates over the list using a helper function.
//
// Iterate iterates over the list and calls the helper function fn()
// on every list item. The function fn() must not modify the list in
// any way. The function fn() must return true to continue the iteration
// and false to stop it.
func (list *MapItem) Iterate(fn func(list, item *MapItem) bool) {
	for item := list.next; list != item && fn(list, item); item = item.next {
	}
}

// Expire performs list item expiration using a helper function.
//
// Expire iterates over the list and calls the helper function fn()
// on every list item. The function fn() must perform an expiration
// test on the list item and perform one of the following:
//
// - If the list item is not expired, fn() must return false. Expire
// will then stop the loop iteration.
//
// - If the list item is expired, fn() has two options. It may remove
// the item by using item.Remove() (item eviction). Or it may remove
// the item by using item.Remove() and reinsert the item at the list
// tail using item.InsertTail(list) (item refresh). In this second case
// care must be taken to ensure that fn() returns false for some item
// in the list; otherwise the Expire iteration will continue forever,
// because the list will never be found empty.
func (list *MapItem) Expire(fn func(list, item *MapItem) bool) {
	for !list.IsEmpty() && fn(list, list.next) {
	}
}

// Map is a map of key/value pairs that also maintains its items
// in an LRU (Least Recently Used) list. LRU items may then be expired.
type Map struct {
	items map[string]*MapItem
	list  *MapItem
	_list MapItem
}

// Items returns the internal map of the cache map.
func (cmap *Map) Items() map[string]*MapItem {
	return cmap.items
}

// Get gets an item by key.
//
// Get "touches" the item to show that it was recently used. For this
// reason Get modifies the internal structure of the cache map and is
// not safe to be called under a read lock.
func (cmap *Map) Get(key string) (*MapItem, bool) {
	item, ok := cmap.items[key]
	if ok {
		item.Remove()
		if !item.IsEmpty() {
			item.InsertTail(cmap.list)
		}
		return item, true
	}
	return nil, false
}

// Set sets an item by key.
//
// Whether the new item can be expired is controlled by the expirable parameter.
// Expirable items are tracked in an LRU list.
func (cmap *Map) Set(key string, newitem *MapItem, expirable bool) {
	item, ok := cmap.items[key]
	if ok {
		item.Remove()
	}
	if expirable {
		newitem.InsertTail(cmap.list)
	} else {
		newitem.Empty()
	}
	cmap.items[key] = newitem
}

// Delete deletes an item by key.
func (cmap *Map) Delete(key string) {
	item, ok := cmap.items[key]
	if ok {
		item.Remove()
		delete(cmap.items, key)
	}
}

// Expire performs list item expiration using a helper function.
//
// See MapItem.Expire for a full discussion.
func (cmap *Map) Expire(fn func(list, item *MapItem) bool) {
	cmap.list.Expire(fn)
}

// InitMap initializes a zero cache map.
//
// The cache map tracks items in the LRU list specified by the list
// parameter. If the list parameter is nil then items are tracked in
// an internal list.
func (cmap *Map) InitMap(list *MapItem) {
	cmap.items = make(map[string]*MapItem)
	if nil != list {
		cmap.list = list
	} else {
		cmap._list.Empty()
		cmap.list = &cmap._list
	}
}

// NewMap creates a new cache map.
//
// The cache map tracks items in the LRU list specified by the list
// parameter. If the list parameter is nil then items are tracked in
// an internal list.
func NewMap(list *MapItem) *Map {
	cmap := &Map{}
	cmap.InitMap(list)
	return cmap
}
