/*
 * appdata_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package appdata

import (
	"testing"
)

func TestAppdata(t *testing.T) {
	dir, err := ConfigDir()
	if nil != err {
		t.Error(err)
	}
	t.Log("config:\t", dir)

	dir, err = DataDir()
	if nil != err {
		t.Error(err)
	}
	t.Log("data:\t", dir)

	dir, err = CacheDir()
	if nil != err {
		t.Error(err)
	}
	t.Log("cache:\t", dir)
}
