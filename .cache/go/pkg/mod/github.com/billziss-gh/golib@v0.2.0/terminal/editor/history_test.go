/*
 * history_test.go
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
	"io"
	"io/ioutil"
	"os"
	"testing"
)

func TestHistory(t *testing.T) {
	history := NewHistory()
	history.SetCap(100)

	n := history.Len()
	if 0 != n {
		t.Error()
	}

	id, line := history.Get(0, 0)
	if 0 != id || "" != line {
		t.Error()
	}

	id, line = history.Get(100, 0)
	if 0 != id || "" != line {
		t.Error()
	}

	history.Add("<1>")
	history.Add("<2>")
	history.Add("<3>")

	n = history.Len()
	if 3 != n {
		t.Error()
	}

	id, line = history.Get(0, 0)
	if 1 != id || "<1>" != line {
		t.Error()
	}
	id, line = history.Get(0, +1)
	if 2 != id || "<2>" != line {
		t.Error()
	}
	id, line = history.Get(0, -1)
	if 3 != id || "<3>" != line {
		t.Error()
	}

	id, line = history.Get(-1, 0)
	if 3 != id || "<3>" != line {
		t.Error()
	}
	id, line = history.Get(-1, +1)
	if 1 != id || "<1>" != line {
		t.Error()
	}
	id, line = history.Get(-1, -1)
	if 2 != id || "<2>" != line {
		t.Error()
	}

	id, line = history.Get(2, 0)
	if 2 != id || "<2>" != line {
		t.Error()
	}
	id, line = history.Get(2, +1)
	if 3 != id || "<3>" != line {
		t.Error()
	}
	id, line = history.Get(2, -1)
	if 1 != id || "<1>" != line {
		t.Error()
	}

	id, line = history.Get(100, 0)
	if 0 != id || "" != line {
		t.Error()
	}

	sum := 0
	history.Enum(0, func(id int, line string) bool {
		sum += id
		return true
	})
	if 6 != sum {
		t.Error()
	}

	sum = 0
	history.Enum(2, func(id int, line string) bool {
		sum += id
		return true
	})
	if 5 != sum {
		t.Error()
	}

	history.SetCap(1)

	n = history.Len()
	if 1 != n {
		t.Error()
	}

	id, line = history.Get(0, 0)
	if 3 != id || "<3>" != line {
		t.Error()
	}
	id, line = history.Get(0, +1)
	if 3 != id || "<3>" != line {
		t.Error()
	}
	id, line = history.Get(0, -1)
	if 3 != id || "<3>" != line {
		t.Error()
	}

	history.Add("<4>")

	n = history.Len()
	if 1 != n {
		t.Error()
	}

	id, line = history.Get(0, 0)
	if 4 != id || "<4>" != line {
		t.Error()
	}
	id, line = history.Get(0, +1)
	if 4 != id || "<4>" != line {
		t.Error()
	}
	id, line = history.Get(0, -1)
	if 4 != id || "<4>" != line {
		t.Error()
	}

	history.SetCap(0)

	n = history.Len()
	if 0 != n {
		t.Error()
	}

	id, line = history.Get(0, 0)
	if 0 != id || "" != line {
		t.Error()
	}
	id, line = history.Get(0, +1)
	if 0 != id || "" != line {
		t.Error()
	}
	id, line = history.Get(0, -1)
	if 0 != id || "" != line {
		t.Error()
	}

	history.Add("<5>")

	n = history.Len()
	if 0 != n {
		t.Error()
	}

	id, line = history.Get(0, 0)
	if 0 != id || "" != line {
		t.Error()
	}
	id, line = history.Get(0, +1)
	if 0 != id || "" != line {
		t.Error()
	}
	id, line = history.Get(0, -1)
	if 0 != id || "" != line {
		t.Error()
	}

	history.SetCap(100)

	history.Add("<6>")
	history.Add("<7>")
	history.Add("<8>")
	history.Add("<9>")
	history.Add("<10>")

	n = history.Len()
	if 5 != n {
		t.Error()
	}

	sum = 0
	history.Enum(0, func(id int, line string) bool {
		sum += id
		return true
	})
	if 40 != sum {
		t.Error()
	}

	history.Delete(8)

	n = history.Len()
	if 4 != n {
		t.Error()
	}

	sum = 0
	history.Enum(0, func(id int, line string) bool {
		sum += id
		return true
	})
	if 32 != sum {
		t.Error()
	}

	history.Delete(0)
	history.Delete(-1)

	n = history.Len()
	if 2 != n {
		t.Error()
	}

	sum = 0
	history.Enum(0, func(id int, line string) bool {
		sum += id
		return true
	})
	if 16 != sum {
		t.Error()
	}

	history.Clear()

	n = history.Len()
	if 0 != n {
		t.Error()
	}

	sum = 0
	history.Enum(0, func(id int, line string) bool {
		sum += id
		return true
	})
	if 0 != sum {
		t.Error()
	}

	history.Add("<11>")
	history.Add("<12>")

	n = history.Len()
	if 2 != n {
		t.Error()
	}

	history.Clear()

	n = history.Len()
	if 0 != n {
		t.Error()
	}
}

func TestHistoryWriteRead(t *testing.T) {
	f, err := ioutil.TempFile("", "history")
	if nil != err {
		t.Fatal(err)
	}
	defer f.Close()
	defer os.Remove(f.Name())

	history := NewHistory()
	history.SetCap(100)

	history.Add("<1>")
	history.Add("<2>")
	history.Add("<3>")

	err = history.Write(f)
	if nil != err {
		t.Fatal(err)
	}

	history.Reset()
	history.SetCap(100)

	n := history.Len()
	if 0 != n {
		t.Error()
	}

	f.Seek(0, io.SeekStart)
	err = history.Read(f)
	if nil != err {
		t.Fatal(err)
	}

	n = history.Len()
	if 3 != n {
		t.Error()
	}

	id, line := history.Get(0, 0)
	if 1 != id || "<1>" != line {
		t.Error()
	}
	id, line = history.Get(0, +1)
	if 2 != id || "<2>" != line {
		t.Error()
	}
	id, line = history.Get(0, +2)
	if 3 != id || "<3>" != line {
		t.Error()
	}
}
