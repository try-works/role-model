/*
 * ioutil_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package util

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReadWriteData(t *testing.T) {
	path := filepath.Join(os.TempDir(), "util_test")
	os.Remove(path)
	defer os.Remove(path)

	s := "hello, world"
	err := WriteData(path, 0644, ([]byte)(s))
	if nil != err {
		t.Error(err)
	}

	b, err := ReadData(path)
	if nil != err {
		t.Error(err)
	}

	if s != string(b) {
		t.Error()
	}
}
