/*
 * map_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package cache

import "testing"

type testItem struct {
	k string
	v int
	f bool
}

var list = []testItem{
	{"one", 1, true},
	{"two", 2, true},
	{"three", 3, false},
	{"four", 4, true},
	{"five", 5, false},
	{"fortytwo", 42, true},
}

func TestMap(t *testing.T) {
	m := NewMap(nil)
	if 0 != len(m.Items()) {
		t.Error()
	}

	for _, e := range list {
		m.Set(e.k, &MapItem{Value: e.v}, e.f)
		r, ok := m.Get(e.k)
		if !ok || r.Value != e.v {
			t.Error()
		}
	}
	if len(list) != len(m.Items()) {
		t.Error()
	}

	for _, e := range list {
		m.Set(e.k, &MapItem{Value: e.v}, e.f)
		r, ok := m.Get(e.k)
		if !ok || r.Value != e.v {
			t.Error()
		}
	}
	if len(list) != len(m.Items()) {
		t.Error()
	}

	for i, e := range list {
		m.Set(e.k, &MapItem{Value: list[(i+1)%len(list)].v}, e.f)
		r, ok := m.Get(e.k)
		if !ok || r.Value != list[(i+1)%len(list)].v {
			t.Error()
		}
	}
	if len(list) != len(m.Items()) {
		t.Error()
	}

	for _, e := range list {
		m.Delete(e.k)
	}
	if 0 != len(m.Items()) {
		t.Error()
	}
}

func TestList(t *testing.T) {
	l := MapItem{}
	l.Empty()

	m := NewMap(&l)
	if 0 != len(m.Items()) {
		t.Error()
	}

	for _, e := range list {
		m.Set(e.k, &MapItem{Value: e}, e.f)
	}
	if len(list) != len(m.Items()) {
		t.Error()
	}

	newlist := make([]int, len(list))
	i := 0
	l.Iterate(func(list, item *MapItem) bool {
		newlist[i] = item.Value.(testItem).v
		i++
		return true
	})

	j := 0
	for _, e := range list {
		if e.f {
			if newlist[j] != e.v {
				t.Error()
			}
			j++
		}
	}
	if j != i {
		t.Error()
	}
}

func TestEvict(t *testing.T) {
	m := NewMap(nil)
	if 0 != len(m.Items()) {
		t.Error()
	}

	for _, e := range list {
		m.Set(e.k, &MapItem{Value: e}, e.f)
	}
	if len(list) != len(m.Items()) {
		t.Error()
	}

	m.Expire(func(list, item *MapItem) bool {
		if 10 > item.Value.(testItem).v {
			m.Delete(item.Value.(testItem).k)
			return true
		}
		return false
	})
	if 3 != len(m.Items()) {
		t.Error()
	}
}
