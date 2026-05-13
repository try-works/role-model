/*
 * history.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package editor

import (
	"bufio"
	"io"
	"sort"
	"sync"
)

// History maintains a buffer of command lines.
type History struct {
	mux   sync.Mutex
	cap   int
	next  int
	items []historyItem
}

type historyItem struct {
	id   int
	line string
}

// index returns the index of the item with the specified id.
// The special id's of 0 or -1 mean to return 0 or len(self.items)-1 respectively.
// index returns -1 if there is no history or it cannot find the specified id.
func (self *History) index(id int) int {
	if 0 >= id {
		if 0 == len(self.items) {
			return -1
		}

		if 0 == id {
			return 0
		} else {
			return len(self.items) - 1
		}
	}

	i := sort.Search(len(self.items), func(i int) bool {
		return self.items[i].id >= id
	})

	if len(self.items) > i && self.items[i].id == id {
		return i
	}

	return -1
}

func (self *History) add(line string) {
	var item historyItem
	self.next++
	item.id = self.next
	item.line = line
	self.items = append(self.items, item)

	self.recap()
}

func (self *History) recap() {
	if 0 <= self.cap && len(self.items) > self.cap {
		self.items = self.items[len(self.items)-self.cap : len(self.items)]
	}
}

// Get gets a command line from the history buffer.
//
// Command lines are identified by an integer id. The special id's of 0 or -1 mean to
// retrieve the first or last command line respectively. The dir parameter is used to
// determine which command line to retrieve relative to the one identified by id: 0 is
// the current command line, +1 is the next command line, -1 is the previous command line,
// etc. When retrieving command lines the history is treated as a circular buffer.
func (self *History) Get(id int, dir int) (int, string) {
	self.mux.Lock()
	defer self.mux.Unlock()

	if i := self.index(id); -1 != i {
		i = (i + dir) % len(self.items)
		if 0 > i {
			i += len(self.items)
		}
		item := self.items[i]
		return item.id, item.line
	}

	return 0, ""
}

// Len returns the length of the history buffer.
func (self *History) Len() int {
	self.mux.Lock()
	defer self.mux.Unlock()

	return len(self.items)
}

// Enum enumerates all command lines in the history buffer starting at id.
// The special id's of 0 or -1 mean to start the enumeration with the first or
// last command line respectively.
func (self *History) Enum(id int, fn func(id int, line string) bool) {
	self.mux.Lock()
	defer self.mux.Unlock()

	if i := self.index(id); -1 != i {
		for ; len(self.items) > i; i++ {
			item := self.items[i]
			if !fn(item.id, item.line) {
				break
			}
		}
	}
}

// Add adds a new command line to the history buffer.
func (self *History) Add(line string) {
	self.mux.Lock()
	defer self.mux.Unlock()

	self.add(line)
}

// Delete deletes a command line from the history buffer.
// The special id's of 0 or -1 mean to delete the first or last command line
// respectively.
func (self *History) Delete(id int) {
	self.mux.Lock()
	defer self.mux.Unlock()

	if i := self.index(id); -1 != i {
		self.items = append(self.items[:i], self.items[i+1:]...)
	}
}

// Clear clears all command lines from the history buffer.
func (self *History) Clear() {
	self.mux.Lock()
	defer self.mux.Unlock()

	self.items = nil
}

// Read reads command lines from a reader into the history buffer.
func (self *History) Read(reader io.Reader) (err error) {
	self.mux.Lock()
	defer self.mux.Unlock()

	bufread := bufio.NewReader(reader)

	for {
		var line string
		line, err = bufread.ReadString('\n')
		if nil != err {
			break
		}

		// only add lines ending in a '\n'
		line = line[:len(line)-1]
		self.add(line)
	}

	if io.EOF == err {
		err = nil
	}

	return
}

// Write writes command lines to a writer from the history buffer.
func (self *History) Write(writer io.Writer) (err error) {
	self.mux.Lock()
	defer self.mux.Unlock()

	bufwrit := bufio.NewWriter(writer)

	for _, item := range self.items {
		bufwrit.WriteString(item.line)
		bufwrit.WriteByte('\n')
	}

	err = bufwrit.Flush()

	return
}

// SetCap sets the capacity (number of command lines) of the history buffer.
func (self *History) SetCap(cap int) {
	self.mux.Lock()
	defer self.mux.Unlock()

	self.cap = cap

	self.recap()
}

// Reset fully resets the history buffer.
func (self *History) Reset() {
	self.mux.Lock()
	defer self.mux.Unlock()

	self.cap = 0
	self.next = 0
	self.items = nil
}

// NewHistory creates a new history buffer.
func NewHistory() *History {
	return &History{}
}
