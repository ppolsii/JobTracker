import { describe, expect, it } from "vitest";

import type {
  AnalyticsApplicationRow,
  ApplicationStatusHistoryEntry,
  NoteExportRow,
} from "@/features/applications/types/application.types";
import type { CalendarEventRecord } from "@/features/calendar/types/calendar.types";
import {
  buildApplicationNotesIndex,
  buildCalendarEvents,
  buildMonthGrid,
  buildWeekGrid,
  deriveStatusHistoryEvents,
  filterCalendarEvents,
  groupEventsByDate,
  mapCustomEventToCalendarEvent,
  searchCalendarEvents,
} from "@/features/calendar/utils/calendar-calculations";

function app(
  overrides: Partial<AnalyticsApplicationRow> & { id: string }
): AnalyticsApplicationRow {
  return {
    company_id: "company-1",
    cv_version_id: "cv-1",
    position: "Backend Engineer",
    source: null,
    work_mode: null,
    employment_type: null,
    application_date: "2026-01-01",
    current_status: "Applied",
    companies: { name: "Acme" },
    cv_versions: { name: "Backend CV" },
    salary_min: null,
    salary_max: null,
    currency: null,
    ...overrides,
  };
}

function historyEntry(
  overrides: Partial<ApplicationStatusHistoryEntry> & {
    application_id: string;
    new_status: ApplicationStatusHistoryEntry["new_status"];
  }
): ApplicationStatusHistoryEntry {
  return {
    id: "history-entry",
    previous_status: null,
    changed_at: "2026-01-02T00:00:00.000Z",
    created_by: "user-1",
    ...overrides,
  };
}

function customEvent(
  overrides: Partial<CalendarEventRecord> & { id: string }
): CalendarEventRecord {
  return {
    user_id: "user-1",
    application_id: null,
    type: "custom",
    title: "Custom title",
    description: null,
    event_date: "2026-01-10",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("deriveStatusHistoryEvents", () => {
  const applications = [app({ id: "app-1", position: "Backend Engineer" })];

  it("maps each documented status transition to its calendar event type", () => {
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({ id: "h1", application_id: "app-1", new_status: "Applied" }),
      historyEntry({
        id: "h2",
        application_id: "app-1",
        new_status: "Recruiter Contact",
      }),
      historyEntry({
        id: "h3",
        application_id: "app-1",
        new_status: "HR Interview",
      }),
      historyEntry({
        id: "h4",
        application_id: "app-1",
        new_status: "Technical Interview",
      }),
      historyEntry({
        id: "h5",
        application_id: "app-1",
        new_status: "Final Interview",
      }),
      historyEntry({ id: "h6", application_id: "app-1", new_status: "Offer" }),
      historyEntry({
        id: "h7",
        application_id: "app-1",
        new_status: "Accepted",
      }),
    ];

    const events = deriveStatusHistoryEvents(applications, history);

    expect(events.map((event) => event.type)).toEqual([
      "application_submitted",
      "recruiter_contact",
      "interview",
      "technical_interview",
      "final_interview",
      "offer_received",
      "offer_accepted",
    ]);
  });

  it("maps a rejection from Offer to 'offer_rejected', distinct from any other rejection", () => {
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        previous_status: "Offer",
        new_status: "Rejected",
      }),
    ];

    const events = deriveStatusHistoryEvents(applications, history);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("offer_rejected");
  });

  it("maps a rejection from any earlier stage to the generic 'rejected' type, rather than dropping it", () => {
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        previous_status: "HR Interview",
        new_status: "Rejected",
      }),
    ];

    const events = deriveStatusHistoryEvents(applications, history);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("rejected");
  });

  it("skips the Wishlist genesis row (not a documented event type)", () => {
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        previous_status: null,
        new_status: "Wishlist",
      }),
    ];

    expect(deriveStatusHistoryEvents(applications, history)).toEqual([]);
  });

  it("skips history entries whose application is not in the given application list (archived/foreign)", () => {
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({
        id: "h1",
        application_id: "unknown-app",
        new_status: "Applied",
      }),
    ];

    expect(deriveStatusHistoryEvents(applications, history)).toEqual([]);
  });

  it("carries over the application's own fields onto the derived event", () => {
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        changed_at: "2026-03-15T10:00:00.000Z",
        new_status: "Applied",
      }),
    ];
    const [event] = deriveStatusHistoryEvents(
      [
        app({
          id: "app-1",
          position: "Data Scientist",
          company_id: "company-9",
          work_mode: "Remote",
          employment_type: "Full Time",
          current_status: "Applied",
          companies: { name: "Initech" },
        }),
      ],
      history
    );

    expect(event).toMatchObject({
      id: "h1",
      type: "application_submitted",
      title: "Data Scientist",
      date: "2026-03-15",
      applicationId: "app-1",
      applicationStatusHistoryId: "h1",
      companyId: "company-9",
      companyName: "Initech",
      position: "Data Scientist",
      description: null,
      workMode: "Remote",
      employmentType: "Full Time",
      applicationStatus: "Applied",
      isCustom: false,
    });
  });
});

describe("mapCustomEventToCalendarEvent", () => {
  it("maps a custom row with no linked application, leaving application-derived fields null", () => {
    const row = customEvent({
      id: "event-1",
      type: "reminder",
      title: "Follow up",
      description: "Call recruiter back",
      event_date: "2026-02-01",
    });

    const event = mapCustomEventToCalendarEvent(row, new Map());

    expect(event).toEqual({
      id: "event-1",
      type: "reminder",
      title: "Follow up",
      date: "2026-02-01",
      applicationId: null,
      applicationStatusHistoryId: null,
      companyId: null,
      companyName: null,
      position: null,
      description: "Call recruiter back",
      workMode: null,
      employmentType: null,
      applicationStatus: null,
      isCustom: true,
    });
  });

  it("enriches a custom row linked to an application with that application's fields", () => {
    const row = customEvent({
      id: "event-1",
      application_id: "app-1",
      type: "custom",
      title: "Prep session",
    });
    const applicationsById = new Map([
      [
        "app-1",
        app({
          id: "app-1",
          company_id: "company-1",
          position: "Backend Engineer",
          work_mode: "Hybrid",
          employment_type: "Contract",
          current_status: "HR Interview",
          companies: { name: "Acme" },
        }),
      ],
    ]);

    const event = mapCustomEventToCalendarEvent(row, applicationsById);

    expect(event).toMatchObject({
      applicationId: "app-1",
      companyId: "company-1",
      companyName: "Acme",
      position: "Backend Engineer",
      workMode: "Hybrid",
      employmentType: "Contract",
      applicationStatus: "HR Interview",
      isCustom: true,
    });
  });
});

describe("buildCalendarEvents", () => {
  it("merges derived and custom events and sorts the result by date ascending", () => {
    const applications = [app({ id: "app-1" })];
    const history: ApplicationStatusHistoryEntry[] = [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        changed_at: "2026-03-01T00:00:00.000Z",
        new_status: "Applied",
      }),
    ];
    const customEvents = [
      customEvent({ id: "e1", event_date: "2026-01-15" }),
      customEvent({ id: "e2", event_date: "2026-06-01" }),
    ];

    const events = buildCalendarEvents(applications, history, customEvents);

    expect(events.map((event) => event.id)).toEqual(["e1", "h1", "e2"]);
    expect(events.map((event) => event.date)).toEqual([
      "2026-01-15",
      "2026-03-01",
      "2026-06-01",
    ]);
  });
});

describe("filterCalendarEvents", () => {
  const events = buildCalendarEvents(
    [
      app({
        id: "app-1",
        company_id: "company-1",
        work_mode: "Remote",
        employment_type: "Full Time",
        current_status: "Applied",
      }),
      app({
        id: "app-2",
        company_id: "company-2",
        work_mode: "On Site",
        employment_type: "Contract",
        current_status: "HR Interview",
      }),
    ],
    [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        changed_at: "2026-01-05T00:00:00.000Z",
        new_status: "Applied",
      }),
      historyEntry({
        id: "h2",
        application_id: "app-2",
        changed_at: "2026-02-10T00:00:00.000Z",
        new_status: "HR Interview",
      }),
    ],
    []
  );

  it("filters by companyId", () => {
    expect(
      filterCalendarEvents(events, { companyId: "company-1" }).map(
        (event) => event.id
      )
    ).toEqual(["h1"]);
  });

  it("filters by eventType", () => {
    expect(
      filterCalendarEvents(events, { eventType: "interview" }).map(
        (event) => event.id
      )
    ).toEqual(["h2"]);
  });

  it("filters by applicationStatus", () => {
    expect(
      filterCalendarEvents(events, { applicationStatus: "HR Interview" }).map(
        (event) => event.id
      )
    ).toEqual(["h2"]);
  });

  it("filters by dateFrom/dateTo (inclusive range)", () => {
    expect(
      filterCalendarEvents(events, {
        dateFrom: "2026-02-01",
        dateTo: "2026-02-28",
      }).map((event) => event.id)
    ).toEqual(["h2"]);
  });

  it("filters by workMode and employmentType", () => {
    expect(
      filterCalendarEvents(events, { workMode: "On Site" }).map(
        (event) => event.id
      )
    ).toEqual(["h2"]);
    expect(
      filterCalendarEvents(events, { employmentType: "Full Time" }).map(
        (event) => event.id
      )
    ).toEqual(["h1"]);
  });

  it("combines multiple filters (AND semantics)", () => {
    expect(
      filterCalendarEvents(events, {
        companyId: "company-2",
        eventType: "interview",
      }).map((event) => event.id)
    ).toEqual(["h2"]);

    expect(
      filterCalendarEvents(events, {
        companyId: "company-1",
        eventType: "interview",
      })
    ).toEqual([]);
  });

  it("returns every event when no filters are given", () => {
    expect(filterCalendarEvents(events, {})).toHaveLength(2);
  });
});

describe("buildApplicationNotesIndex / searchCalendarEvents", () => {
  const events = buildCalendarEvents(
    [
      app({ id: "app-1", position: "Backend Engineer", companies: { name: "Acme" } }),
      app({ id: "app-2", position: "Data Analyst", companies: { name: "Globex" } }),
    ],
    [
      historyEntry({
        id: "h1",
        application_id: "app-1",
        changed_at: "2026-01-05T00:00:00.000Z",
        new_status: "Applied",
      }),
      historyEntry({
        id: "h2",
        application_id: "app-2",
        changed_at: "2026-01-06T00:00:00.000Z",
        new_status: "Applied",
      }),
    ],
    []
  );
  const notes: NoteExportRow[] = [
    {
      id: "note-1",
      application_id: "app-2",
      content: "Recruiter mentioned equity package.",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  const notesIndex = buildApplicationNotesIndex(notes);

  it("groups note content by application id", () => {
    expect(notesIndex.get("app-2")).toEqual([
      "Recruiter mentioned equity package.",
    ]);
    expect(notesIndex.has("app-1")).toBe(false);
  });

  it("returns every event unchanged when the query is empty/whitespace", () => {
    expect(searchCalendarEvents(events, "   ", notesIndex)).toEqual(events);
  });

  it("matches by company name (case-insensitive)", () => {
    expect(
      searchCalendarEvents(events, "acme", notesIndex).map((e) => e.id)
    ).toEqual(["h1"]);
  });

  it("matches by position (case-insensitive)", () => {
    expect(
      searchCalendarEvents(events, "data analyst", notesIndex).map((e) => e.id)
    ).toEqual(["h2"]);
  });

  it("matches by note content, via the notes index", () => {
    expect(
      searchCalendarEvents(events, "equity", notesIndex).map((e) => e.id)
    ).toEqual(["h2"]);
  });

  it("returns no matches for an unrelated query", () => {
    expect(searchCalendarEvents(events, "nonexistent", notesIndex)).toEqual([]);
  });
});

describe("groupEventsByDate", () => {
  it("groups events sharing the same date together, preserving arrival order", () => {
    const events = buildCalendarEvents(
      [app({ id: "app-1" })],
      [
        historyEntry({
          id: "h1",
          application_id: "app-1",
          changed_at: "2026-01-05T00:00:00.000Z",
          new_status: "Applied",
        }),
      ],
      [customEvent({ id: "e1", event_date: "2026-01-05" })]
    );

    const groups = groupEventsByDate(events);

    expect([...groups.keys()]).toEqual(["2026-01-05"]);
    expect(groups.get("2026-01-05")?.map((e) => e.id)).toEqual(["h1", "e1"]);
  });
});

describe("buildMonthGrid", () => {
  it("returns a 42-cell, Monday-start grid marking which cells belong to the requested month", () => {
    // February 2026 starts on a Sunday.
    const cells = buildMonthGrid([], 2026, 1);

    expect(cells).toHaveLength(42);
    expect(cells[0].date).toBe("2026-01-26"); // Monday before Feb 1
    const currentPeriodCells = cells.filter((cell) => cell.isCurrentPeriod);
    expect(currentPeriodCells).toHaveLength(28);
    expect(currentPeriodCells[0].date).toBe("2026-02-01");
  });

  it("places each event on its matching day cell", () => {
    const events = buildCalendarEvents(
      [app({ id: "app-1" })],
      [
        historyEntry({
          id: "h1",
          application_id: "app-1",
          changed_at: "2026-02-10T00:00:00.000Z",
          new_status: "Applied",
        }),
      ],
      []
    );

    const cells = buildMonthGrid(events, 2026, 1);
    const matchingCell = cells.find((cell) => cell.date === "2026-02-10");

    expect(matchingCell?.events.map((e) => e.id)).toEqual(["h1"]);
  });
});

describe("buildWeekGrid", () => {
  it("returns the 7 Monday-start days containing the reference date", () => {
    // 2026-01-07 is a Wednesday.
    const cells = buildWeekGrid([], new Date(Date.UTC(2026, 0, 7)));

    expect(cells).toHaveLength(7);
    expect(cells.every((cell) => cell.isCurrentPeriod)).toBe(true);
    expect(cells[0].date).toBe("2026-01-05"); // Monday
    expect(cells[6].date).toBe("2026-01-11"); // Sunday
  });
});
