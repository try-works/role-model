/*
 * retry_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package retry

import (
	"fmt"
	"testing"
	"time"
)

func TestRetry(t *testing.T) {
	prev := time.Now()
	Retry(Count(5), Backoff(time.Millisecond*100, time.Second), func(i int) bool {
		curr := time.Now()
		fmt.Println("retrying", i, curr.Sub(prev))
		prev = curr
		return true
	})
}
