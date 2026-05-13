/*
 * appdata_darwin.go
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
	"os/user"
	"path/filepath"
)

// Darwin: use well-known locations.
//
// We should probably be using API's like NSSearchPathForDirectoriesInDomains or FSFindFolder,
// but cannot without cgo.

func init() {
	configDir := ""
	dataDir := ""
	cacheDir := ""

	h := ""
	u, e := user.Current()
	if nil == e {
		h = u.HomeDir

		configDir = filepath.Join(h, "Library/Preferences")
		dataDir = filepath.Join(h, "Library/Application Support")
		cacheDir = filepath.Join(h, "Library/Caches")
	}

	DefaultAppData = &systemAppData{configDir, dataDir, cacheDir, e}
}
