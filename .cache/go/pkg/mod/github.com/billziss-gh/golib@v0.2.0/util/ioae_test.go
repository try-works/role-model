/*
 * ioae_test.go
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

func TestReadWriteAeData(t *testing.T) {
	path := filepath.Join(os.TempDir(), "util_test")
	os.Remove(path)
	defer os.Remove(path)

	key := []byte("passpasspasspass")

	s := "hello, encrypted world"
	err := WriteAeData(path, 0644, ([]byte)(s), key)
	if nil != err {
		t.Error(err)
	}

	b, err := ReadAeData(path, key)
	if nil != err {
		t.Error(err)
	}

	if s != string(b) {
		t.Error()
	}
}
