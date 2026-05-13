/*
 * retry.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package retry implements simple retry functionality.
//
// For example to retry an HTTP request:
//
//     func Do(client *http.Client, req *http.Request) (rsp *http.Response, err error) {
//         retry.Retry(
//             retry.Count(5),
//             retry.Backoff(time.Second, time.Second*30),
//             func(i int) bool {
//                 if 0 < i {
//                     req.Body, err = req.GetBody()
//                     if nil != err {
//                         return false
//                     }
//                 }
//                 rsp, err = client.Do(req)
//                 if nil != err {
//                     return false
//                 }
//                 if 500 <= rsp.StatusCode && nil != req.GetBody {
//                     rsp.Body.Close()
//                     return true
//                 }
//                 return false
//             })
//
//         return
//     }
package retry

import (
	"math/rand"
	"time"
)

// Retry performs actions repeatedly until one of the actions returns false.
func Retry(actions ...func(int) bool) {
	for i := 0; ; i++ {
		for _, action := range actions {
			if !action(i) {
				return
			}
		}
	}
}

// Count limits the number of retries performed by Retry.
func Count(retries int) func(int) bool {
	return func(i int) bool {
		return retries > i
	}
}

// Backoff implements an exponential backoff with jitter.
func Backoff(sleep, maxsleep time.Duration) func(int) bool {
	return func(i int) bool {
		if 0 < i {
			if sleep > maxsleep {
				sleep = maxsleep
			}
			time.Sleep(sleep)
			sleep = time.Duration((1.5 + rand.Float64()) * float64(sleep))
		}
		return true
	}
}
