package com.otomen.tracker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class VaultRevisionTest {
    @Test fun acceptsJsonNumericRepresentations() {
        assertEquals(0L, VaultRevision.parse(0))
        assertEquals(15L, VaultRevision.parse(15))
        assertEquals(15L, VaultRevision.parse(15L))
        assertEquals(15L, VaultRevision.parse(15.0))
        assertEquals(9007199254740991L, VaultRevision.parse(9007199254740991L))
    }

    @Test fun rejectsMissingCoercedAndInvalidRevisions() {
        listOf(null, "15", true, -1, 1.5, Double.NaN, Double.POSITIVE_INFINITY, 9007199254740992L).forEach {
            assertThrows(IllegalArgumentException::class.java) { VaultRevision.parse(it) }
        }
    }
}
