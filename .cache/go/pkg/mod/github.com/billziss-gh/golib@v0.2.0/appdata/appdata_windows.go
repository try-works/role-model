/*
 * appdata_windows.go
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
	"os"
	"os/user"
	"path/filepath"
)

// Windows: use environment variables and well-known locations.
//
// A perhaps better solution would be to use SHGetKnownFolderPath.

func init() {
	configDir := ""
	dataDir := ""
	cacheDir := ""

	h := ""
	u, e := user.Current()
	if nil == e {
		h = u.HomeDir

		configDir = os.Getenv("APPDATA")
		dataDir = os.Getenv("APPDATA")
		cacheDir = os.TempDir()

		if "" == configDir {
			configDir = filepath.Join(h, "AppData\\Roaming")
		}

		if "" == dataDir {
			dataDir = filepath.Join(h, "AppData\\Roaming")
		}

		if "" == cacheDir {
			cacheDir = filepath.Join(h, "AppData\\Local\\Temp")
		}
	}

	DefaultAppData = &systemAppData{configDir, dataDir, cacheDir, e}
}
