'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useSession } from "next-auth/react";

type BookingRow = {
  id: string;
  branchId: string;
  branchName: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  note: string;
  note1: string | null; // Booking source: "online" or "admin:username"
  note5: string | null; // Booking created date and time
  status: string;
  confirmDatetime: string | null;
  lineId: string | null;
  createdAt: string;
  updatedAt: string;
};

type BookingFormState = {
  id?: string;
  branchId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  status: string;
};

type BranchOption = {
  id: string;
  name: string;
};

type ServiceOption = {
  id: string;
  name: string;
};

type StaffOption = {
  id: string;
  name: string;
  branchId: number | null;
  employeeNumber?: string | null;
};

export default function AdminBookingsPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'view2'>('view2');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingRow[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [allStaff, setAllStaff] = useState<StaffOption[]>([]); // Store all staff for filtering
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showBookingActionModal, setShowBookingActionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);
  const [notificationResult, setNotificationResult] = useState<{ bookingId: string; message: string; isError: boolean } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(120); // 2 minutes in seconds
  const { data: session } = useSession();
  
  // View 2 states
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  // List view branch filter
  const [listBranchFilter, setListBranchFilter] = useState<string>("");
  const [openingHours, setOpeningHours] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [staffHolidays, setStaffHolidays] = useState<Set<string>>(new Set()); // Set of staff IDs who have holiday on selected date
  const [searchStaff, setSearchStaff] = useState("");
  const [searchBooker, setSearchBooker] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'self' | 'arrived' | 'waiting'>('all');
  const [form, setForm] = useState<BookingFormState>({
    branchId: "",
    serviceId: "",
    staffId: "",
    date: "",
    time: "",
    customerName: "",
    customerPhone: "",
    status: "confirmed",
  });
  const [formTimeSlots, setFormTimeSlots] = useState<Array<{ id: string; time: string }>>([]);
  const [formTimeSlotsLoading, setFormTimeSlotsLoading] = useState(false);

  async function loadBookings(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      console.log('[AdminBookings] Starting loadBookings, silent:', silent);
      const res = await fetch("/api/admin/bookings");
      console.log('[AdminBookings] Fetch response status:', res.status, res.statusText);
      const data = await res.json();
      if (!res.ok) {
        console.error('[AdminBookings] API error:', data);
        throw new Error(data.error || "โหลดข้อมูลการจองไม่สำเร็จ");
      }
      const bookingsData = data.bookings ?? [];
      console.log(`[AdminBookings] Loaded ${bookingsData.length} bookings from API`);
      
      // Count bookings on 2026-01-10
      const bookingsOnDate = bookingsData.filter((b: BookingRow) => b.date === '2026-01-10');
      if (bookingsOnDate.length > 0) {
        console.log(`[AdminBookings] Bookings on 2026-01-10: ${bookingsOnDate.length}`);
        const byBranch = bookingsOnDate.reduce((acc: Record<string, number>, b: BookingRow) => {
          const branchId = b.branchId || 'null';
          acc[branchId] = (acc[branchId] || 0) + 1;
          return acc;
        }, {});
        console.log(`[AdminBookings] Bookings on 2026-01-10 by branch:`, byBranch);
      }
      
      setBookings(bookingsData);
      setFilteredBookings(bookingsData);
      setError(null);
      setLastUpdated(new Date());
      console.log('[AdminBookings] loadBookings completed successfully');
    } catch (err: any) {
      console.error('[AdminBookings] loadBookings error:', err);
      setError(err.message ?? "โหลดข้อมูลการจองไม่สำเร็จ");
    } finally {
      console.log('[AdminBookings] Setting loading to false');
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  async function loadOptions() {
    try {
      const [branchesRes, servicesRes, staffRes] = await Promise.all([
        fetch("/api/admin/branches"),
        fetch("/api/admin/services"),
        fetch("/api/admin/staff"),
      ]);

      const branchesData = await branchesRes.json();
      const servicesData = await servicesRes.json();
      const staffData = await staffRes.json();

      if (branchesRes.ok) {
        setBranches(branchesData.branches?.map((b: any) => ({ id: b.id, name: b.name })) || []);
      }
      if (servicesRes.ok) {
        setServices(servicesData.services?.map((s: any) => ({ id: s.id, name: s.name })) || []);
      }
      if (staffRes.ok) {
        const staffList = staffData.staff?.map((s: any) => {
          // Format name from prename + fname + lname
          const name = `${s.prename || ''}${s.fname || ''} ${s.lname || ''}`.trim() || 'ไม่ระบุชื่อ';
          return { 
            id: s.id, 
            name,
            branchId: s.branch_id ? Number(s.branch_id) : null,
            employeeNumber: s.employee_number || null
          };
        }) || [];
        setAllStaff(staffList);
        setStaff(staffList); // Initially show all staff
      }
    } catch (err) {
      console.error("Failed to load options", err);
    }
  }

  // Load opening hours when branch is selected (for view2)
  async function loadOpeningHours(branchId: string) {
    if (!branchId) {
      setOpeningHours([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/opening-hours?branchId=${branchId}`);
      const data = await res.json();
      if (res.ok && data.timeSlots) {
        setOpeningHours(data.timeSlots);
      } else {
        setOpeningHours([]);
      }
    } catch (err) {
      console.error("Failed to load opening hours", err);
      setOpeningHours([]);
    }
  }

  // Load staff holidays for selected date and branch
  async function loadStaffHolidays(date: string, branchId: string) {
    if (!date || !branchId) {
      setStaffHolidays(new Set());
      return;
    }
    try {
      const res = await fetch(`/api/admin/staff-holidays?branchId=${branchId}`);
      const data = await res.json();
      if (res.ok && data.holidays) {
        // Filter holidays for the selected date
        // API returns holidayDate as string in YYYY-MM-DD format
        const selectedDateStr = date.split('T')[0]; // Get YYYY-MM-DD from ISO string
        
        const holidayStaffIds = new Set<string>();
        data.holidays.forEach((h: any) => {
          // holidayDate from API is already in YYYY-MM-DD format
          if (h.holidayDate === selectedDateStr) {
            holidayStaffIds.add(h.staffId);
          }
        });
        setStaffHolidays(holidayStaffIds);
      } else {
        setStaffHolidays(new Set());
      }
    } catch (err) {
      console.error("Failed to load staff holidays", err);
      setStaffHolidays(new Set());
    }
  }

  useEffect(() => {
    void loadBookings();
    void loadOptions();
  }, []);

  // Auto-select first branch when branches are loaded (for view2)
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId && activeTab === 'view2') {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId, activeTab]);

  // Setup SSE connection for real-time booking updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let retryCount = 0;
    const maxRetry = 3;
    let isMounted = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupSSE = () => {
      if (!isMounted) return;

      try {
        // Close existing connection if any
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource('/api/admin/bookings/events');
        console.log('[SSE Client] EventSource created, readyState:', eventSource.readyState);

        eventSource.onopen = () => {
          console.log('[SSE Client] Connection opened, readyState:', eventSource?.readyState);
          if (!isMounted) {
            eventSource?.close();
            return;
          }
          retryCount = 0; // Reset retry count on successful connection
          // Clear fallback interval if SSE is working
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        eventSource.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            console.log('[SSE Client] Received message:', data.event);
            
            // Ignore ping events (but log them occasionally for debugging)
            if (data.event === 'ping') {
              return;
            }
            
            if (data.event === 'connected') {
              console.log('[SSE Client] Successfully connected to SSE server');
            }
            
            if (data.event === 'booking_created') {
              console.log('[SSE Client] Booking created event received, refreshing list');
              // Refresh bookings silently (without showing loading spinner)
              void loadBookings(true);
            }
          } catch (error) {
            console.error('[SSE Client] Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.log('[SSE Client] Error event, readyState:', eventSource?.readyState, error);
          
          if (!isMounted) {
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            return;
          }

          // Check if connection is in a bad state
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            retryCount += 1;
            console.log(`[SSE Client] Connection closed, retry ${retryCount}/${maxRetry}`);

            // ปิดการเชื่อมต่อเดิม
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }

            // ถ้าเกินจำนวนครั้งที่กำหนด ให้ fallback เป็น polling
            if (retryCount > maxRetry) {
              // SSE connection failed, using polling mode instead
              if (!fallbackInterval) {
                console.log('SSE connection failed after max retries, switching to polling mode');
                fallbackInterval = setInterval(() => {
                  if (isMounted) {
                  void loadBookings(true);
                  }
                }, 30000);
              }
              return;
            }

            // Clear any existing reconnect timeout
            if (reconnectTimeout) {
              clearTimeout(reconnectTimeout);
            }

            // ลองเชื่อมต่อใหม่หลัง 5 วินาที (เพิ่ม delay เพื่อลด load)
            reconnectTimeout = setTimeout(() => {
              if (isMounted) {
                setupSSE();
              }
            }, 5000);
          }
          // If readyState is CONNECTING or OPEN, ignore the error (it might be transient)
        };
      } catch (error) {
        console.error('Failed to setup SSE:', error);
        // Fallback to polling on error
        if (!fallbackInterval && isMounted) {
          fallbackInterval = setInterval(() => {
            if (isMounted) {
              void loadBookings(true);
            }
          }, 30000);
        }
      }
    };

    setupSSE();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, []);

  // Reload bookings when selectedDate or selectedBranchId changes (for view2)
  useEffect(() => {
    if (activeTab === 'view2') {
      void loadBookings(true);
    }
  }, [selectedDate, selectedBranchId, activeTab]);

  // Auto-refresh bookings every 2 minutes for view2
  useEffect(() => {
    if (activeTab !== 'view2') {
      setCountdownSeconds(120); // Reset countdown when not in view2
      return;
    }

    // Reset countdown when entering view2
    setCountdownSeconds(120);

    const intervalId = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          void loadBookings(true); // Silent reload
          return 120; // Reset to 2 minutes
        }
        return prev - 1;
      });
    }, 1000); // Update every 1 second

    // Cleanup on unmount or tab change
    return () => {
      clearInterval(intervalId);
    };
  }, [activeTab]);

  // Load opening hours when branch is selected (for view2)
  useEffect(() => {
    if (activeTab === 'view2' && selectedBranchId) {
      void loadOpeningHours(selectedBranchId);
      void loadStaffHolidays(selectedDate, selectedBranchId);
    } else {
      setOpeningHours([]);
      setStaffHolidays(new Set());
    }
  }, [selectedBranchId, selectedDate, activeTab]);

  // Filter staff by selected branch in form
  useEffect(() => {
    const currentBranchId = form.branchId || "";
    const currentStaffId = form.staffId || "";
    
    if (currentBranchId) {
      const branchIdNum = Number(currentBranchId);
      const filtered = allStaff.filter(s => {
        // Include staff with matching branch_id or staff with null branch_id (can work at any branch)
        return s.branchId === null || s.branchId === branchIdNum;
      });
      setStaff(filtered);
      
      // Reset staffId if current selection is not in filtered list
      if (currentStaffId && !filtered.find(s => s.id === currentStaffId)) {
        setForm((prev) => ({ ...prev, staffId: "" }));
      }
    } else {
      // Show all staff if no branch is selected
      setStaff(allStaff);
      if (currentStaffId) {
        setForm((prev) => ({ ...prev, staffId: "" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branchId, form.staffId, allStaff.length]);

  // Load time slots from opening hours when branch is selected in form
  useEffect(() => {
    async function loadFormTimeSlots() {
      if (!form.branchId) {
        setFormTimeSlots([]);
        // Don't reset time if we're editing (have form.id)
        if (!form.id) {
          setForm((prev) => ({ ...prev, time: "" }));
        }
        return;
      }

      try {
        setFormTimeSlotsLoading(true);
        const res = await fetch(`/api/admin/opening-hours?branchId=${encodeURIComponent(form.branchId)}`);
        const data = await res.json();
        
        if (res.ok && data.timeSlots && data.timeSlots.length > 0) {
          // Generate time slots similar to TimeSelection component
          const slots = data.timeSlots.map((hour: { startTime: string; endTime: string }, index: number) => {
            const timeRange = `${hour.startTime} - ${hour.endTime}`;
            return {
              id: `t-${index}-${hour.startTime}-${hour.endTime}`,
              time: timeRange
            };
          });
          setFormTimeSlots(slots);
          
          // If current time is not in the new slots, try to match it
          if (form.time && !slots.find((s: { id: string }) => s.id === form.time)) {
            // If time is in old format (e.g., "08:30" or "08:30 - 09:30"), try to find matching slot
            const currentTimeStr = form.time.includes(' - ') 
              ? form.time 
              : form.time; // Old format might be just "HH:mm"
            
            // Try to find a matching slot by time string
            const matchingSlot = slots.find((s: { time: string }) => s.time === currentTimeStr);
            if (matchingSlot) {
              setForm((prev) => ({ ...prev, time: matchingSlot.id }));
            } else if (!form.id) {
              // Only reset if not editing (new booking)
              setForm((prev) => ({ ...prev, time: "" }));
            }
            // If editing and no match found, keep the original value
          }
        } else {
          setFormTimeSlots([]);
          // Don't reset time if we're editing
          if (!form.id) {
            setForm((prev) => ({ ...prev, time: "" }));
          }
        }
      } catch (err) {
        console.error("Failed to load time slots for form", err);
        setFormTimeSlots([]);
      } finally {
        setFormTimeSlotsLoading(false);
      }
    }

    void loadFormTimeSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branchId]);


  // Filter bookings based on search query and branch filter
  useEffect(() => {
    let filtered = [...bookings];

    // Filter by branch if selected
    if (listBranchFilter) {
      filtered = filtered.filter((b) => b.branchId === listBranchFilter);
    }

    // Filter by search query
    const trimmedQuery = searchQuery?.trim() || '';
    if (trimmedQuery) {
      const query = trimmedQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(query) ||
          b.customerPhone?.toLowerCase().includes(query) ||
          b.branchName?.toLowerCase().includes(query) ||
          b.serviceName?.toLowerCase().includes(query) ||
          b.staffName?.toLowerCase().includes(query) ||
          b.status?.toLowerCase().includes(query),
      );
    }

    setFilteredBookings(filtered);
  }, [searchQuery, bookings, listBranchFilter]);

  async function handleOffSubmit() {
    if (!form.branchId || !form.serviceId || !form.staffId || !form.date || !form.time) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน (สาขา, บริการ, พนักงาน, วันที่, เวลา)");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Check if slot is already booked (only for new bookings)
      if (!form.id) {
        // Parse time slot to extract start and end time for comparison
        let formStartTime = '';
        let formEndTime = '';
        const formTime = form.time.trim();
        
        // If time is in format "t-0-08:30-09:30", extract start and end time
        if (formTime.startsWith('t-')) {
          const timeMatch = formTime.match(/(\d{2}:\d{2})-(\d{2}:\d{2})$/);
          if (timeMatch) {
            formStartTime = timeMatch[1];
            formEndTime = timeMatch[2];
          }
        } else if (formTime.includes(' - ')) {
          // If format is "08:30 - 09:30"
          const parts = formTime.split(' - ');
          formStartTime = parts[0].trim();
          formEndTime = parts[1]?.trim() || '';
        } else {
          formStartTime = formTime;
        }

        // Check if there's an existing booking for the same staff, date, and time
        const conflictingBooking = bookings.find(b => {
          // Check if same staff and date
          const sameStaff = b.staffId === form.staffId;
          const bookingDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
          const sameDate = bookingDate === form.date;
          
          if (!sameStaff || !sameDate) return false;

          // Check if time overlaps
          const bookingTime = b.time?.trim() || '';
          if (!bookingTime) return false;

          // Parse booking time to compare - extract start and end time
          let bookingStartTime = '';
          let bookingEndTime = '';
          
          if (bookingTime.startsWith('t-')) {
            const timeMatch = bookingTime.match(/(\d{2}:\d{2})-(\d{2}:\d{2})$/);
            if (timeMatch) {
              bookingStartTime = timeMatch[1];
              bookingEndTime = timeMatch[2];
            }
          } else if (bookingTime.includes(' - ')) {
            const parts = bookingTime.split(' - ');
            bookingStartTime = parts[0].trim();
            bookingEndTime = parts[1]?.trim() || '';
          } else {
            bookingStartTime = bookingTime;
          }

          // Check if times match exactly (same start time is enough for same slot)
          const timeMatches = (formStartTime && bookingStartTime && formStartTime === bookingStartTime) ||
                             (formTime === bookingTime);

          // Check if status allows booking (pending or confirmed)
          const isActive = !b.status || b.status === 'pending' || b.status === 'confirmed';

          return timeMatches && isActive;
        });

        if (conflictingBooking) {
          setError(`ช่วงเวลานี้มีคนจองแล้ว: ${conflictingBooking.customerName} (${conflictingBooking.customerPhone}) กรุณาเลือก slot อื่น`);
          setSubmitting(false);
          return;
        }
      }

      if (form.id) {
        // Update
        const res = await fetch(`/api/admin/bookings/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: parseInt(form.staffId),
            bookDate: form.date,
            bookTime: form.time,
            bookerName: "off",
            bookerTel: "off",
            branchId: form.branchId ? parseInt(form.branchId) : null,
            serviceId: form.serviceId ? parseInt(form.serviceId) : null,
            status: form.status || "confirmed",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "แก้ไขข้อมูลการจองไม่สำเร็จ");
        }
      } else {
        // Create
        const res = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: parseInt(form.staffId),
            bookDate: form.date,
            bookTime: form.time,
            bookerName: "off",
            bookerTel: "off",
            branchId: form.branchId ? parseInt(form.branchId) : null,
            serviceId: form.serviceId ? parseInt(form.serviceId) : null,
            status: form.status || "confirmed",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Show detailed error message if available
          const errorMsg = data.error || "บันทึกข้อมูลการจองไม่สำเร็จ";
          const detailsMsg = data.details ? `\n${data.details}` : "";
          throw new Error(errorMsg + detailsMsg);
        }
      }

      setShowModal(false);
      setForm({
        branchId: "",
        serviceId: "",
        staffId: "",
        date: "",
        time: "",
        customerName: "",
        customerPhone: "",
        status: "confirmed",
      });
      await loadBookings();
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลการจองไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.branchId || !form.serviceId || !form.staffId || !form.date || !form.time || !form.customerName || !form.customerPhone) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Check if slot is already booked (only for new bookings)
      if (!form.id) {
        // Parse time slot to extract start and end time for comparison
        let formStartTime = '';
        let formEndTime = '';
        const formTime = form.time.trim();
        
        // If time is in format "t-0-08:30-09:30", extract start and end time
        if (formTime.startsWith('t-')) {
          const timeMatch = formTime.match(/(\d{2}:\d{2})-(\d{2}:\d{2})$/);
          if (timeMatch) {
            formStartTime = timeMatch[1];
            formEndTime = timeMatch[2];
          }
        } else if (formTime.includes(' - ')) {
          // If format is "08:30 - 09:30"
          const parts = formTime.split(' - ');
          formStartTime = parts[0].trim();
          formEndTime = parts[1]?.trim() || '';
        } else {
          formStartTime = formTime;
        }

        // Check if there's an existing booking for the same staff, date, and time
        const conflictingBooking = bookings.find(b => {
          // Check if same staff and date
          const sameStaff = b.staffId === form.staffId;
          const bookingDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
          const sameDate = bookingDate === form.date;
          
          if (!sameStaff || !sameDate) return false;

          // Check if time overlaps
          const bookingTime = b.time?.trim() || '';
          if (!bookingTime) return false;

          // Parse booking time to compare - extract start and end time
          let bookingStartTime = '';
          let bookingEndTime = '';
          
          if (bookingTime.startsWith('t-')) {
            const timeMatch = bookingTime.match(/(\d{2}:\d{2})-(\d{2}:\d{2})$/);
            if (timeMatch) {
              bookingStartTime = timeMatch[1];
              bookingEndTime = timeMatch[2];
            }
          } else if (bookingTime.includes(' - ')) {
            const parts = bookingTime.split(' - ');
            bookingStartTime = parts[0].trim();
            bookingEndTime = parts[1]?.trim() || '';
          } else {
            bookingStartTime = bookingTime;
          }

          // Check if times match exactly (same start time is enough for same slot)
          const timeMatches = (formStartTime && bookingStartTime && formStartTime === bookingStartTime) ||
                             (formTime === bookingTime);

          // Check if status allows booking (pending or confirmed)
          const isActive = !b.status || b.status === 'pending' || b.status === 'confirmed';

          return timeMatches && isActive;
        });

        if (conflictingBooking) {
          setError(`ช่วงเวลานี้มีคนจองแล้ว: ${conflictingBooking.customerName} (${conflictingBooking.customerPhone}) กรุณาเลือก slot อื่น`);
          setSubmitting(false);
          return;
        }
      }

      if (form.id) {
        // Update
        const res = await fetch(`/api/admin/bookings/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: parseInt(form.staffId),
            bookDate: form.date,
            bookTime: form.time,
            bookerName: form.customerName,
            bookerTel: form.customerPhone,
            branchId: form.branchId ? parseInt(form.branchId) : null,
            serviceId: form.serviceId ? parseInt(form.serviceId) : null,
            status: form.status || "confirmed",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "แก้ไขข้อมูลการจองไม่สำเร็จ");
        }
      } else {
        // Create
        const res = await fetch("/api/admin/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empId: parseInt(form.staffId),
            bookDate: form.date,
            bookTime: form.time,
            bookerName: form.customerName,
            bookerTel: form.customerPhone,
            branchId: form.branchId ? parseInt(form.branchId) : null,
            serviceId: form.serviceId ? parseInt(form.serviceId) : null,
            status: form.status || "confirmed",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Show detailed error message if available
          const errorMsg = data.error || "บันทึกข้อมูลการจองไม่สำเร็จ";
          const detailsMsg = data.details ? `\n${data.details}` : "";
          throw new Error(errorMsg + detailsMsg);
        }
      }

      setShowModal(false);
      setForm({
        branchId: "",
        serviceId: "",
        staffId: "",
        date: "",
        time: "",
        customerName: "",
        customerPhone: "",
        status: "confirmed",
      });
      await loadBookings();
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลการจองไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  // Manual refresh function
  async function handleRefresh() {
    await loadBookings(true);
  }

  async function handleDelete(id: string, booking?: BookingRow) {
    if (!booking) {
      // Fallback for old calls without booking parameter
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการจองนี้?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ลบข้อมูลการจองไม่สำเร็จ");
      }
      await loadBookings();
    } catch (err: any) {
      alert(err.message ?? "ลบข้อมูลการจองไม่สำเร็จ");
    }
      return;
    }

    // Get admin username for logging
    let adminUsername = "admin";
    try {
      if (session?.user) {
        const rawProfile = (session.user as any)?.profile;
        try {
          const profile = typeof rawProfile === 'string' ? JSON.parse(rawProfile) : rawProfile;
          adminUsername = profile?.name || profile?.name_th || profile?.name_eng || profile?.provider_id || session.user.name || "admin";
        } catch {
          adminUsername = session.user.name || "admin";
        }
      }
    } catch (err) {
      console.error("Failed to get admin username:", err);
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบการจองของ ${booking.customerName}?`)) {
      return;
    }

    try {
      // Delete the booking (log is handled in the API endpoint)
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ลบข้อมูลการจองไม่สำเร็จ");
      }
      
      await loadBookings(true);
      if (showBookingActionModal) {
        setShowBookingActionModal(false);
        setSelectedBooking(null);
      }
    } catch (err: any) {
      alert(err.message ?? "ลบข้อมูลการจองไม่สำเร็จ");
    }
  }

  async function handleConfirmFromModal() {
    if (!selectedBooking) return;
    await handleConfirmBooking(selectedBooking);
    setShowBookingActionModal(false);
    setSelectedBooking(null);
  }

  async function handleDeleteFromModal() {
    if (!selectedBooking) return;
    await handleDelete(selectedBooking.id, selectedBooking);
  }

  async function handleConfirmBooking(booking: BookingRow) {
    const isConfirmed = booking.status === "completed" || booking.confirmDatetime !== null;
    
    if (isConfirmed) {
      // Already confirmed, toggle back to unconfirmed
      if (!confirm(`ยกเลิกการยืนยันการมาของ ${booking.customerName} หรือไม่?`)) {
        return;
      }
    } else {
      if (!confirm(`ยืนยันการมาของ ${booking.customerName} หรือไม่?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      // Update booking status and confirm_datetime
      const dateObj = new Date(booking.date);
      const dateStr = dateObj.toISOString().split('T')[0];
      
      // Toggle between confirmed and pending
      const newStatus = isConfirmed ? "pending" : "completed";
      const newConfirmDatetime = isConfirmed ? null : new Date().toISOString();
      
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empId: parseInt(booking.staffId),
          branchId: booking.branchId ? parseInt(booking.branchId) : null,
          serviceId: booking.serviceId ? parseInt(booking.serviceId) : null,
          bookDate: dateStr,
          bookTime: booking.time,
          bookerName: booking.customerName,
          bookerTel: booking.customerPhone,
          note1: booking.note1 || null,
          note4: booking.note || "",
          note5: booking.note5 || "",
          status: newStatus,
          confirmDatetime: newConfirmDatetime,
          lineId: booking.lineId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ยืนยันการจองไม่สำเร็จ");
      }
      
      await loadBookings(true); // Silent reload
    } catch (err: any) {
      setError(err.message ?? "ยืนยันการจองไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendNotification(booking: BookingRow) {
    if (!booking.lineId) {
      alert("ลูกค้าไม่มี LINE ID ในระบบ");
      return;
    }

    try {
      setSendingNotificationId(booking.id);
      setNotificationResult(null);
      setError(null);

      const res = await fetch(`/api/admin/bookings/${booking.id}/send-notification`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถส่งการแจ้งเตือนได้");
      }

      setNotificationResult({
        bookingId: booking.id,
        message: data.message || "ส่งการแจ้งเตือนเรียบร้อย",
        isError: false,
      });
      
      // Clear result after 3 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 3000);
    } catch (err: any) {
      setNotificationResult({
        bookingId: booking.id,
        message: err.message || "ไม่สามารถส่งการแจ้งเตือนได้",
        isError: true,
      });
      
      // Clear error result after 5 seconds
      setTimeout(() => {
        setNotificationResult(null);
      }, 5000);
    } finally {
      setSendingNotificationId(null);
    }
  }

  function handleEdit(booking: BookingRow) {
    const dateObj = new Date(booking.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    
    // If time is in format "t-0-08:30-09:30", use it directly
    // Otherwise, try to match it with existing slots or keep it as is
    let timeValue = booking.time;
    
    // If time doesn't start with "t-", it might be an old format
    // We'll keep it and let the useEffect handle matching when slots load
    if (!timeValue.startsWith('t-') && booking.time) {
      // Try to convert old time format to time slot id if possible
      // This will be handled when time slots load in useEffect
      timeValue = booking.time;
    }
    
    setForm({
      id: booking.id,
      branchId: booking.branchId,
      serviceId: booking.serviceId,
      staffId: booking.staffId,
      date: dateStr,
      time: timeValue,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      status: booking.status,
    });
    setError(null);
    setShowModal(true);
  }

  function handleAdd() {
    // Auto-select first service if available
    const defaultServiceId = services.length > 0 ? services[0].id : "";
    
    setForm({
      branchId: "",
      serviceId: defaultServiceId,
      staffId: "",
      date: "",
      time: "",
      customerName: "",
      customerPhone: "",
      status: "confirmed",
    });
    setError(null);
    setShowModal(true);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      case "cancelled":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case "confirmed":
        return "ยืนยันแล้ว";
      case "completed":
        return "เสร็จสิ้น";
      case "cancelled":
        return "ยกเลิก";
      default:
        return status;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              รายการจอง
            </h1>
            {isRefreshing && (
              <Icon
                icon="solar:refresh-bold"
                className="h-4 w-4 animate-spin text-primary-600"
              />
            )}
          </div>
          <p className="text-sm text-stone-500">
            ใช้เพิ่ม/แก้ไข/ลบข้อมูลการจอง เช่น สาขา บริการ พนักงาน วันที่ เวลา และข้อมูลลูกค้า
          </p>
          {lastUpdated && (
            <p className="mt-1 text-[11px] text-stone-400">
              อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
        >
          <span>+</span>
          <span>เพิ่ม</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex gap-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'list'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            รายการจอง
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('view2')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'view2'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            รายการจองรายวัน
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && (
        <>
      {/* Search bar and branch filter */}
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-stone-700 whitespace-nowrap">เลือกสาขา:</label>
            <select
              value={listBranchFilter}
              onChange={(e) => setListBranchFilter(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">-- ทั้งหมด --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Icon
            icon="solar:magnifer-linear"
            className="h-4 w-4 text-stone-400"
          />
          <input
            type="text"
            placeholder="ค้นหาการจอง (ชื่อลูกค้า, เบอร์โทร, สาขา, บริการ, พนักงาน, สถานะ)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <Icon
              icon="solar:refresh-bold"
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            >
              <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ตารางการจอง */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-stone-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            {searchQuery
              ? "ไม่พบข้อมูลที่ค้นหา"
              : "ยังไม่มีข้อมูลการจอง ลองกดปุ่ม \"เพิ่ม\" ด้านบนขวา"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-100/50 text-[11px] font-semibold text-stone-700">
                  <th className="px-4 py-3 text-center w-12">ลำดับ</th>
                  <th className="px-4 py-3 text-left">ลูกค้า</th>
                  <th className="px-4 py-3 text-left">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left">สาขา</th>
                  <th className="px-4 py-3 text-left">บริการ</th>
                  <th className="px-4 py-3 text-left">พนักงาน</th>
                  <th className="px-4 py-3 text-left">วันที่/เวลา</th>
                  <th className="px-4 py-3 text-left">ผู้จอง</th>
                  <th className="px-4 py-3 text-left">วันที่บันทึก</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, index) => (
                  <tr
                    key={b.id}
                    className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3 text-center text-stone-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-stone-900">
                        {b.customerName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          icon="solar:phone-calling-bold"
                          className="h-3.5 w-3.5 text-stone-400"
                        />
                        <span className="text-sm text-stone-700 font-mono">
                          {b.customerPhone}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {b.branchName}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {b.serviceName}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {b.staffName}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      <div className="flex flex-col">
                        <span>{new Date(b.date).toLocaleDateString("th-TH")}</span>
                        <span className="text-xs text-stone-500">
                          {b.time?.startsWith('t-') 
                            ? b.time.split('-').slice(2).join(' - ') // Extract time from "t-0-08:30-09:30" -> "08:30 - 09:30"
                            : b.time || "ไม่ระบุ"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {b.note1 ? (
                        b.note1.startsWith('admin:') ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-blue-700">Admin</span>
                            <span className="text-xs text-stone-600">{b.note1.replace('admin:', '')}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700">Online</span>
                        )
                      ) : (
                        <span className="text-xs text-stone-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {b.note5 ? (
                        <div className="flex flex-col">
                          <span className="text-xs">{b.note5.split(' ')[0]}</span>
                          <span className="text-xs text-stone-500">{b.note5.split(' ')[1] || ''}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusColor(b.status)}`}>
                        {getStatusText(b.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {(() => {
                          const isConfirmed = b.status === "completed" || b.confirmDatetime !== null;
                          return (
                            <button
                              type="button"
                              onClick={() => !submitting && handleConfirmBooking(b)}
                              disabled={submitting}
                              className={`rounded-md px-2 py-1 text-xs font-semibold border ${
                                isConfirmed
                                  ? "text-blue-700 border-blue-200 hover:bg-blue-50"
                                  : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                              title={isConfirmed ? "คลิกเพื่อยกเลิกการยืนยัน" : "คลิกเพื่อยืนยันการมาของลูกค้า"}
                            >
                              {isConfirmed ? "ยกเลิกยืนยัน" : "ยืนยัน"}
                            </button>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => handleSendNotification(b)}
                          disabled={sendingNotificationId === b.id || !b.lineId}
                          className="rounded-md px-2 py-1 text-xs text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={b.lineId ? "ส่งแจ้งเตือน LINE" : "ลูกค้าไม่มี LINE ID"}
                        >
                          {sendingNotificationId === b.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                          ) : (
                            <Icon icon="solar:paper-plane-2-bold" className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(b)}
                          className="rounded-md px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                          title="แก้ไข"
                        >
                          <Icon icon="solar:pen-linear" className="h-4 w-4 text-black" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          title="ลบ"
                        >
                          <Icon
                            icon="solar:trash-bin-trash-linear"
                            className="h-4 w-4"
                          />
                        </button>
                      </div>
                      {notificationResult && notificationResult.bookingId === b.id && (
                        <div className={`mt-1 text-[10px] ${notificationResult.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {notificationResult.message}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {activeTab === 'view2' && (
        <div className="space-y-4">
          {/* Date Picker and Search */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-medium text-stone-700">เลือกสาขา:</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="">-- เลือกสาขา --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-stone-700">เลือกวันที่:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <Icon icon="solar:calendar-linear" className="h-4 w-4 text-stone-400" />
              </div>
              {/* Countdown Timer */}
              <div className="flex items-center gap-2">
                <Icon icon="solar:refresh-bold" className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-medium text-stone-700">
                  รีเฟรชอัตโนมัติใน:
                </span>
                <span className="text-xs font-bold text-primary-600 font-mono">
                  {Math.floor(countdownSeconds / 60)}:{(countdownSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="ค้นชื่อพนักงาน..."
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                className="flex-1 min-w-[150px] rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <input
                type="text"
                placeholder="ค้นชื่อผู้จอง..."
                value={searchBooker}
                onChange={(e) => setSearchBooker(e.target.value)}
                className="flex-1 min-w-[150px] rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm placeholder:text-stone-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    // Filter bookings by selected date and branch for status counts
                    const statusFilteredBookings = bookings.filter(b => {
                // Normalize date format
                const bookingDate = typeof b.date === 'string' ? b.date.split('T')[0] : '';
                
                // Filter by date - normalize both dates for comparison
                const normalizedBookingDate = bookingDate.trim();
                const normalizedSelectedDate = selectedDate.trim();
                const dateMatches = normalizedBookingDate === normalizedSelectedDate;
                
                // Filter by branch if selected - convert both to numbers for comparison
                let branchMatches = true;
                if (selectedBranchId) {
                  const selectedBranchIdNum = Number(selectedBranchId);
                  const bookingBranchIdNum = b.branchId ? Number(b.branchId) : null;
                  branchMatches = bookingBranchIdNum === selectedBranchIdNum;
                }
                
                return dateMatches && branchMatches;
              });

              return (
                <>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    ทั้งหมด {statusFilteredBookings.length} คน
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('self')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'self'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    จองเอง {statusFilteredBookings.filter(b => b.status === 'confirmed').length} คน
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('arrived')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'arrived'
                        ? 'bg-blue-600 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    มาแล้ว {statusFilteredBookings.filter(b => b.status === 'completed').length} คน
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('waiting')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === 'waiting'
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    รออีก {statusFilteredBookings.filter(b => b.status === 'confirmed').length} คน
                  </button>
                </>
              );
            })()}
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-sm text-stone-500">
                กำลังโหลดข้อมูล...
              </div>
            ) : (
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/50">
                    <th className="px-3 py-2 text-left font-semibold text-stone-700">No</th>
                    <th className="px-3 py-2 text-left font-semibold text-stone-700">พนักงาน</th>
                    {openingHours.length > 0 ? (
                      openingHours.map((hour, index) => {
                        return (
                          <th
                            key={index}
                            className="px-3 py-2 text-center font-semibold text-stone-700"
                          >
                            {hour.startTime} - {hour.endTime}
                          </th>
                        );
                      })
                    ) : (
                      <th colSpan={6} className="px-3 py-2 text-center font-medium text-stone-500">
                        กรุณาเลือกสาขาเพื่อแสดงช่วงเวลา
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Filter bookings by selected date and branch
                    const dateFiltered = bookings.filter(b => {
                      // Normalize date format - handle various date formats
                      // b.date is always a string in BookingRow type
                      let bookingDateStr = '';
                      const dateValue = b.date as string | Date;
                      
                      if (typeof dateValue === 'string') {
                        // Extract date part from string (handle ISO strings like "2025-01-06T00:00:00.000Z")
                        bookingDateStr = dateValue.split('T')[0].trim();
                      } else if (dateValue instanceof Date) {
                        // Convert Date object to YYYY-MM-DD string in local timezone
                        const year = dateValue.getFullYear();
                        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                        const day = String(dateValue.getDate()).padStart(2, '0');
                        bookingDateStr = `${year}-${month}-${day}`;
                      }
                      
                      if (!bookingDateStr) return false;
                      
                      // Filter by date - normalize both dates for comparison
                      const normalizedBookingDate = bookingDateStr.trim();
                      const normalizedSelectedDate = selectedDate.trim();
                      const dateMatches = normalizedBookingDate === normalizedSelectedDate;
                      
                      // Filter by branch if selected - convert both to numbers for comparison
                      let branchMatches = true;
                      if (selectedBranchId) {
                        const selectedBranchIdNum = Number(selectedBranchId);
                        const bookingBranchIdNum = b.branchId ? Number(b.branchId) : null;
                        branchMatches = bookingBranchIdNum === selectedBranchIdNum;
                      }
                      
                      return dateMatches && branchMatches;
                    });
                    
                    // Debug log for date filter
                    if (selectedDate === '2026-01-10' || (selectedDate && dateFiltered.length > 0)) {
                      console.log(`[View2] Selected date: ${selectedDate}, Selected branch: ${selectedBranchId || 'all'}`);
                      console.log(`[View2] Total bookings: ${bookings.length}, Date filtered: ${dateFiltered.length}`);
                      
                      if (selectedDate === '2026-01-10') {
                        console.log(`[View2] ALL bookings on 2026-01-10 after filter (${dateFiltered.length} total):`, dateFiltered.map(b => ({
                          id: b.id,
                          date: b.date,
                          branchId: b.branchId,
                          branchName: b.branchName,
                          staffId: b.staffId,
                          staffName: b.staffName,
                          customerName: b.customerName,
                          customerPhone: b.customerPhone,
                          time: b.time,
                          status: b.status
                        })));
                        
                        // Group by branch
                        const byBranch = dateFiltered.reduce((acc, b) => {
                          const branchId = b.branchId || 'null';
                          if (!acc[branchId]) acc[branchId] = [];
                          acc[branchId].push(b);
                          return acc;
                        }, {} as Record<string, typeof dateFiltered>);
                        console.log(`[View2] Bookings on 2026-01-10 by branch:`, Object.entries(byBranch).map(([branchId, bookings]) => ({
                          branchId,
                          count: bookings.length,
                          branchName: bookings[0]?.branchName
                        })));
                      } else if (dateFiltered.length > 0) {
                        console.log(`[View2] Sample booking dates:`, dateFiltered.slice(0, 5).map(b => ({ id: b.id, date: b.date, branchId: b.branchId, customerName: b.customerName })));
                      }
                    }
                    
                    // Group bookings by staff
                    const staffMap = new Map<string, BookingRow[]>();
                    dateFiltered.forEach(booking => {
                      if (!staffMap.has(booking.staffId)) {
                        staffMap.set(booking.staffId, []);
                      }
                      staffMap.get(booking.staffId)!.push(booking);
                    });
                    
                    // Get all staff from the system
                    // Filter staff by selected branch for view2
                    let filteredStaffForView2 = allStaff;
                    if (selectedBranchId) {
                      const branchIdNum = Number(selectedBranchId);
                      filteredStaffForView2 = allStaff.filter(s => {
                        // Include staff with matching branch_id or staff with null branch_id (can work at any branch)
                        return s.branchId === null || s.branchId === branchIdNum;
                      });
                    }
                    
                    // Sort by employee_number (ascending), then by name
                    filteredStaffForView2.sort((a, b) => {
                      // First, sort by employee_number
                      const aNum = a.employeeNumber ? Number(a.employeeNumber) : 999999;
                      const bNum = b.employeeNumber ? Number(b.employeeNumber) : 999999;
                      if (aNum !== bNum) {
                        return aNum - bNum;
                      }
                      // If employee_number is the same or both null, sort by name
                      return a.name.localeCompare(b.name, 'th');
                    });
                    
                    // Create a map of all staff (including those without bookings)
                    // Only show staff if branch is selected
                    const allStaffMap = new Map<string, { id: string; name: string; bookings: BookingRow[] }>();
                    
                    // Only add staff if branch is selected
                    if (selectedBranchId) {
                      // First, add all filtered staff from the system
                      filteredStaffForView2.forEach(s => {
                        allStaffMap.set(s.id, {
                          id: s.id,
                          name: s.name,
                          bookings: []
                        });
                      });
                    }
                    
                    // Then, add bookings to staff who have them
                    dateFiltered.forEach(booking => {
                      if (allStaffMap.has(booking.staffId)) {
                        allStaffMap.get(booking.staffId)!.bookings.push(booking);
                      } else {
                        // If staff is not in the system list, add them with booking
                        allStaffMap.set(booking.staffId, {
                          id: booking.staffId,
                          name: booking.staffName || 'ไม่ระบุ',
                          bookings: [booking]
                        });
                      }
                    });
                    
                    // Debug log for staff map
                    if (selectedDate === '2026-01-10') {
                      console.log(`[View2] allStaffMap size: ${allStaffMap.size}, dateFiltered: ${dateFiltered.length}`);
                      const totalBookingsInMap = Array.from(allStaffMap.values()).reduce((sum, staff) => sum + staff.bookings.length, 0);
                      console.log(`[View2] Total bookings in allStaffMap: ${totalBookingsInMap}`);
                      console.log(`[View2] Staff with bookings:`, Array.from(allStaffMap.entries()).map(([staffId, staffData]) => ({
                        staffId,
                        staffName: staffData.name,
                        bookingCount: staffData.bookings.length
                      })));
                    }

                    // Check if branch is selected first
                    if (!selectedBranchId) {
                      return (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-sm text-stone-500">
                            กรุณาเลือกสาขาเพื่อแสดงข้อมูล
                          </td>
                        </tr>
                      );
                    }

                    // Time slots from opening hours
                    const timeSlots = openingHours.length > 0
                      ? openingHours.map(hour => `${hour.startTime} - ${hour.endTime}`)
                      : [];

                    if (timeSlots.length === 0) {
                      return (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-sm text-stone-500">
                            กรุณาเลือกสาขาเพื่อแสดงช่วงเวลา
                          </td>
                        </tr>
                      );
                    }

                    // Helper function to parse time slot
                    const parseBookingTime = (timeStr: string | null | undefined): string | null => {
                      if (!timeStr) return null;
                      
                      const trimmed = timeStr.trim();
                      if (!trimmed) return null;
                      
                      // If it's a time slot ID like "t-0-08:30-09:30" or "t-3-15:00-17:00"
                      if (trimmed.startsWith('t-')) {
                        // Try to extract times using regex to handle both formats
                        const timeMatch = trimmed.match(/(\d{2}:\d{2})[\s-]+(\d{2}:\d{2})/);
                        if (timeMatch) {
                          // Extract start and end time: "t-3-15:00-17:00" -> "15:00 - 17:00"
                          return `${timeMatch[1]} - ${timeMatch[2]}`;
                        }
                        // Fallback: split by '-' and take last two parts if they match time pattern
                        const parts = trimmed.split('-');
                        if (parts.length >= 4) {
                          const startTime = parts[parts.length - 2]?.trim();
                          const endTime = parts[parts.length - 1]?.trim();
                          // Check if they match time pattern (HH:mm)
                          if (startTime && endTime && /^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime)) {
                            return `${startTime} - ${endTime}`;
                          }
                        }
                      }
                      
                      // If it's already in "HH:mm - HH:mm" format (with space)
                      if (trimmed.includes(' - ')) {
                        return trimmed;
                      }
                      
                      // If it's in "HH:mm-HH:mm" format (without space), add space
                      const noSpaceMatch = trimmed.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
                      if (noSpaceMatch) {
                        return `${noSpaceMatch[1]} - ${noSpaceMatch[2]}`;
                      }
                      
                      // If it's just "HH:mm", try to match with time slots by start time only
                      // But for now, return as is
                      return trimmed;
                    };

                    // Filter staff entries (now using allStaffMap instead of staffMap)
                    // Then sort by employee_number
                    const staffEntries = Array.from(allStaffMap.entries())
                      .filter(([staffId, staffData]) => {
                        const staffName = staffData.name;
                        // Filter by search staff name
                        if (searchStaff && !staffName.toLowerCase().includes(searchStaff.toLowerCase())) {
                          return false;
                        }
                        return true;
                      })
                      .sort(([staffIdA, staffDataA], [staffIdB, staffDataB]) => {
                        // Find staff info from filteredStaffForView2 to get employee_number
                        const staffA = filteredStaffForView2.find(s => s.id === staffIdA);
                        const staffB = filteredStaffForView2.find(s => s.id === staffIdB);
                        
                        // Sort by employee_number first
                        const aNum = staffA?.employeeNumber ? Number(staffA.employeeNumber) : 999999;
                        const bNum = staffB?.employeeNumber ? Number(staffB.employeeNumber) : 999999;
                        if (aNum !== bNum) {
                          return aNum - bNum;
                        }
                        // If employee_number is the same or both null, sort by name
                        return staffDataA.name.localeCompare(staffDataB.name, 'th');
                      });

                    if (staffEntries.length === 0) {
                      return (
                        <tr>
                          <td colSpan={timeSlots.length + 2} className="px-4 py-8 text-center text-sm text-stone-500">
                            ไม่พบข้อมูลพนักงานสำหรับวันที่ {new Date(selectedDate).toLocaleDateString('th-TH')}
                          </td>
                        </tr>
                      );
                    }

                    // Debug log for staff entries
                    if (selectedDate === '2026-01-10') {
                      console.log(`[View2] staffEntries count: ${staffEntries.length}`);
                      const totalBookingsInEntries = staffEntries.reduce((sum, [, staffData]) => sum + staffData.bookings.length, 0);
                      console.log(`[View2] Total bookings in staffEntries: ${totalBookingsInEntries}`);
                    }
                    
                    return staffEntries.map(([staffId, staffData], index) => {
                        const staffName = staffData.name;
                        const staffBookings = staffData.bookings;
                        const isOnHoliday = staffHolidays.has(staffId);
                        
                        // Debug log for each staff's bookings
                        if (selectedDate === '2026-01-10' && staffBookings.length > 0) {
                          console.log(`[View2] Staff ${staffName} (${staffId}) has ${staffBookings.length} bookings:`, staffBookings.map(b => ({
                            id: b.id,
                            customerName: b.customerName,
                            time: b.time
                          })));
                        }

                        return (
                          <tr key={staffId} className="border-b border-stone-100 hover:bg-stone-50/50">
                            <td className="px-3 py-2 text-center text-stone-600">{index + 1}</td>
                            <td className="px-3 py-2 font-medium text-stone-800 bg-stone-50/50">{staffName}</td>
                            {timeSlots.map((slot, slotIndex) => {
                              // If staff is on holiday, show "off" for all time slots
                              if (isOnHoliday) {
                                return (
                                  <td key={slotIndex} className="px-2 py-2 align-top">
                                    <div className="rounded-lg border shadow-sm p-2.5 bg-red-50 border-red-300">
                                      <div className="font-semibold text-xs leading-tight text-red-900">
                                        off
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              // Find booking for this time slot
                              const booking = staffBookings.find(b => {
                                const parsedTime = parseBookingTime(b.time);
                                if (!parsedTime) {
                                  if (selectedDate === '2026-01-10' && staffId === staffData.id) {
                                    console.log(`[View2] Booking ${b.id} (${b.customerName}) - Cannot parse time: "${b.time}"`);
                                  }
                                  return false;
                                }
                                
                                // Normalize both times for comparison (remove extra spaces)
                                const normalizedParsed = parsedTime.trim().replace(/\s+/g, ' ');
                                const normalizedSlot = slot.trim().replace(/\s+/g, ' ');
                                
                                // Exact match
                                const exactMatch = normalizedParsed === normalizedSlot;
                                if (exactMatch) return true;
                                
                                // Also check if times overlap (start time matches)
                                const parsedParts = normalizedParsed.split(/\s*-\s*/);
                                const slotParts = normalizedSlot.split(/\s*-\s*/);
                                const parsedStartTime = parsedParts[0]?.trim();
                                const slotStartTime = slotParts[0]?.trim();
                                
                                if (parsedStartTime && slotStartTime && parsedStartTime === slotStartTime) {
                                  return true;
                                }
                                
                                if (selectedDate === '2026-01-10' && staffId === staffData.id) {
                                  console.log(`[View2] Booking ${b.id} (${b.customerName}) - Time "${normalizedParsed}" does not match slot "${normalizedSlot}"`);
                                }
                                
                                return false;
                              });

                              // Filter by search
                              if (booking) {
                                if (searchBooker) {
                                  const q = searchBooker.toLowerCase();
                                  const nameMatch = booking.customerName.toLowerCase().includes(q);
                                  const phoneMatch = (booking.customerPhone || '').toLowerCase().includes(q);
                                  if (!nameMatch && !phoneMatch) {
                                    return (
                                      <td key={slotIndex} className="px-2 py-2 text-center text-stone-300">-</td>
                                    );
                                  }
                                }

                                const isConfirmed = booking.status === "completed" || booking.confirmDatetime !== null;
                                const isOff = booking.customerName.toLowerCase() === "off";
                                const isFromLine = booking.lineId !== null || booking.note1 === "online";
                                const isFromAdmin = booking.note1?.startsWith("admin:");
                                
                                // Color priority: off > LINE > admin > default (confirmed uses original color with checkmark)
                                const getBookingColors = () => {
                                  if (isOff) {
                                    return {
                                      bg: "bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400",
                                      title: "text-red-900",
                                      phone: "text-red-800"
                                    };
                                  }
                                  if (isFromLine) {
                                    return {
                                      bg: "bg-violet-50 border-violet-300 hover:bg-violet-100 hover:border-violet-400",
                                      title: "text-violet-900",
                                      phone: "text-violet-800"
                                    };
                                  }
                                  if (isFromAdmin) {
                                    return {
                                      bg: "bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400",
                                      title: "text-amber-900",
                                      phone: "text-amber-800"
                                    };
                                  }
                                  // Default (pending, unknown source)
                                  return {
                                    bg: "bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400",
                                    title: "text-emerald-900",
                                    phone: "text-emerald-800"
                                  };
                                };
                                
                                const colors = getBookingColors();
                                
                                return (
                                  <td key={slotIndex} className="px-2 py-2 align-top">
                                    <div 
                                      onClick={() => {
                                        if (!submitting) {
                                          setSelectedBooking(booking);
                                          setShowBookingActionModal(true);
                                        }
                                      }}
                                      className={`relative rounded-lg border shadow-sm p-2.5 cursor-pointer transition-colors ${colors.bg} ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                                      title="คลิกเพื่อจัดการการจอง"
                                    >
                                      {isConfirmed && (
                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                                          <span className="text-white text-[10px] font-bold">✓</span>
                                        </div>
                                      )}
                                      <div className={`font-semibold mb-1 text-sm leading-tight ${colors.title}`}>
                                        {booking.customerName}
                                      </div>
                                      <div className={`font-mono text-xs font-medium ${colors.phone}`}>
                                        {booking.customerPhone}
                                      </div>
                                    </div>
                                  </td>
                                );
                              } else {
                                // Empty slot - make it clickable to add booking
                                return (
                                  <td 
                                    key={slotIndex} 
                                    className="px-2 py-2 text-center text-stone-300 cursor-pointer hover:bg-primary-50 hover:text-primary-600 transition-colors group relative"
                                    onClick={() => {
                                      if (!selectedBranchId) {
                                        alert('กรุณาเลือกสาขาก่อน');
                                        return;
                                      }
                                      
                                      // Find the time slot ID from openingHours
                                      const timeSlotId = openingHours[slotIndex] 
                                        ? `t-${slotIndex}-${openingHours[slotIndex].startTime}-${openingHours[slotIndex].endTime}`
                                        : '';
                                      
                                      // Auto-select first service if available
                                      const defaultServiceId = services.length > 0 ? services[0].id : "";
                                      
                                      // Set form with selected date, time, branch, staff, and default service
                                      setForm({
                                        id: "",
                                        branchId: selectedBranchId,
                                        serviceId: defaultServiceId,
                                        staffId: staffId,
                                        date: selectedDate,
                                        time: timeSlotId,
                                        customerName: "",
                                        customerPhone: "",
                                        status: "confirmed",
                                      });
                                      setError(null);
                                      setShowModal(true);
                                    }}
                                    title={`คลิกเพื่อเพิ่มการจอง\nวันที่: ${new Date(selectedDate).toLocaleDateString('th-TH')}\nเวลา: ${slot}`}
                                  >
                                    <span className="text-stone-400 group-hover:text-primary-600 group-hover:font-bold transition-all">+</span>
                                  </td>
                                );
                              }
                            })}
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไขการจอง */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl rounded-xl border border-stone-200 bg-white p-5 lg:p-6 xl:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  {form.id ? "แก้ไขข้อมูลการจอง" : "เพิ่มการจองใหม่"}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  กรอกข้อมูลการจองให้ครบถ้วน
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                  void loadBookings(true); // Refresh data when closing modal
                }}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
              >
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    สาขา <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.branchId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, branchId: e.target.value }))
                    }
                  >
                    <option value="">เลือกสาขา</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    บริการ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.serviceId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, serviceId: e.target.value }))
                    }
                  >
                    <option value="">เลือกบริการ</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  พนักงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={form.staffId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, staffId: e.target.value }))
                  }
                >
                  <option value="">เลือกพนักงาน</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    วันที่ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    เวลา <span className="text-rose-500">*</span>
                  </label>
                  {formTimeSlotsLoading ? (
                    <div className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-500 bg-stone-50">
                      กำลังโหลดเวลา...
                    </div>
                  ) : formTimeSlots.length > 0 ? (
                    <select
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.time}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                    >
                      <option value="">เลือกเวลา</option>
                      {formTimeSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.time}
                        </option>
                      ))}
                    </select>
                  ) : form.branchId ? (
                    <div className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-700 bg-amber-50">
                      สาขานี้ยังไม่ได้ตั้งค่าเวลาเปิด-ปิด
                    </div>
                  ) : (
                    <div className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-500 bg-stone-50">
                      กรุณาเลือกสาขาก่อน
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    ชื่อลูกค้า <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.customerName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    placeholder="เช่น สมชาย ใจดี"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.customerPhone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                    }
                    placeholder="เช่น 0812345678"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  สถานะ
                </label>
                <select
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="confirmed">ยืนยันแล้ว</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="cancelled">ยกเลิก</option>
                </select>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                    void loadBookings(true); // Refresh data when closing modal
                  }}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleOffSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon
                    icon="solar:close-circle-bold"
                    className="h-4 w-4"
                  />
                  off
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon
                    icon={submitting ? "solar:hourglass-line-bold" : "solar:check-circle-bold"}
                    className="h-4 w-4"
                  />
                  {submitting
                    ? "กำลังบันทึก..."
                    : form.id
                      ? "บันทึกการแก้ไข"
                      : "บันทึกการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal จัดการการจอง (ยืนยันมา/ลบ) */}
      {showBookingActionModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">จัดการการจอง</h2>
              <button
                type="button"
                onClick={() => {
                  setShowBookingActionModal(false);
                  setSelectedBooking(null);
                }}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
              >
                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Booking Details */}
              <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-600">ชื่อลูกค้า:</span>
                  <span className="text-sm font-semibold text-stone-900">{selectedBooking.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-600">เบอร์โทร:</span>
                  <span className="text-sm text-stone-700 font-mono">{selectedBooking.customerPhone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-600">วันที่:</span>
                  <span className="text-sm text-stone-700">
                    {new Date(selectedBooking.date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-600">เวลา:</span>
                  <span className="text-sm text-stone-700">{selectedBooking.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-600">พนักงาน:</span>
                  <span className="text-sm text-stone-700">{selectedBooking.staffName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-600">สถานะ:</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedBooking.status === 'completed' || selectedBooking.confirmDatetime
                      ? 'bg-blue-100 text-blue-700'
                      : selectedBooking.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedBooking.status === 'completed' || selectedBooking.confirmDatetime ? 'ยืนยันแล้ว' : 
                     selectedBooking.status === 'cancelled' ? 'ยกเลิก' : 'รอยืนยัน'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {(selectedBooking.status !== 'completed' && !selectedBooking.confirmDatetime) ? (
                  <button
                    type="button"
                    onClick={handleConfirmFromModal}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ยืนยันมา
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmFromModal}
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ยกเลิกการยืนยัน
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteFromModal}
                  disabled={submitting}
                  className="flex-1 rounded-lg border-2 border-rose-600 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
