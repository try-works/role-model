// +build darwin linux

/*
 * reader_unix.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package terminal

import "io"

func newReader(r io.Reader) io.Reader {
	return r
}
