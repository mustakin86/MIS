<template>
  <aside class="sidebar d-flex flex-column" :class="{ 'collapsed': isCollapsed }" id="sidebar">
    <div class="p-3 pb-2">
      <div class="d-flex align-items-center justify-content-between px-1">
        <div class="d-flex align-items-center gap-2">
          <div class="bg-primary rounded-2 d-flex align-items-center justify-content-center text-white fw-bold"
            style="width: 24px; height: 24px; font-size: 0.75rem;">M</div>
          <span class="fw-bold text-dark fs-6">MIS</span>
        </div>
      </div>
    </div>

    <div class="sidebar-content px-3">
      <ul class="nav nav-pills flex-column gap-1">
        <li class="nav-item">
          <RouterLink to="/" class="nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </RouterLink>
        </li>
        <li class="nav-item">
          <a href="#" class="nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <line x1="18" x2="18" y1="20" y2="10" />
              <line x1="12" x2="12" y1="20" y2="4" />
              <line x1="6" x2="6" y1="20" y2="14" />
            </svg>
            Analytics
          </a>
        </li>

        <!-- User Dropdown -->
        <li class="nav-item">
          <a href="#connectCollapse" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            User
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="connectCollapse">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/user" class="nav-link py-1 fs-7">User list</RouterLink>
              </li>
            </ul>
          </div>
        </li>

        <!-- Skill Management Dropdown -->
        <li class="nav-item">
          <a href="#skillTest" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            Skill Management
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="skillTest">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/Empolyee_Evaluation" class="nav-link py-1 fs-7">Skill Test</RouterLink>
              </li>
              <li>
                <RouterLink to="/test" class="nav-link py-1 fs-7"> Test</RouterLink>
              </li>
            </ul>
          </div>
        </li>

        <!-- Library Dropdown -->
        <li class="nav-item">
          <a href="#library" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            Library
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="library">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/item_list" class="nav-link py-1 fs-7">Item List</RouterLink>
              </li>
              <li>
                <RouterLink to="/machine_list" class="nav-link py-1 fs-7">Machine List</RouterLink>
              </li>
            </ul>
          </div>
        </li>

        <!-- SMV Dropdown -->
        <li class="nav-item">
          <a href="#smv" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            S.m.v Library
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="smv">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/add_smv" class="nav-link py-1 fs-7">Add SMV</RouterLink>
              </li>
              <li>
                <RouterLink to="/smv_list" class="nav-link py-1 fs-7">SMV List</RouterLink>
              </li>
            </ul>
          </div>
        </li>
        <li class="nav-item">
          <a href="#ob" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            Operation Breakdown
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="ob">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/add_ob" class="nav-link py-1 fs-7">Add Operation </RouterLink>
              </li>
              <li>
                <RouterLink to="/ob_list" class="nav-link py-1 fs-7">OB List</RouterLink>
              </li>
            </ul>
          </div>
        </li>
        <li class="nav-item">
          <a href="#lbs" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            L.B.S
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="lbs">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/add_lbs" class="nav-link py-1 fs-7">Add L.B.S </RouterLink>
              </li>
            </ul>
          </div>
        </li>
        <li class="nav-item">
          <a href="#npt" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 1 7.07 7.07l1.71-1.71" />
            </svg>
            N.P.T
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="npt">
            <ul class="nav nav-pills flex-column gap-1">
              <li>
                <RouterLink to="/npt_by_qr_code" class="nav-link py-1 fs-7">NPT </RouterLink>
              </li>
              <li>
                <RouterLink to="/add_problem" class="nav-link py-1 fs-7">Add Problem</RouterLink>
              </li>
              <li>
                <RouterLink to="/addMachine" class="nav-link py-1 fs-7">Add Machine</RouterLink>
              </li>
            </ul>
          </div>
        </li>

        <!-- Operations Dropdown -->
        <li class="nav-item">
          <a href="#smvCollapse" class="nav-link dropdown-toggle collapsed" data-bs-toggle="collapse" role="button"
            aria-expanded="false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="me-2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Operations
          </a>
          <div class="collapse ms-3 border-start ps-2 my-1" id="smvCollapse">
            <ul class="nav nav-pills flex-column gap-1">
              <li><a href="#" class="nav-link py-1 fs-7">SMV Breakdowns</a></li>
              <li><a href="#" class="nav-link py-1 fs-7">Machine Targets</a></li>
              <li><a href="#" class="nav-link py-1 fs-7">Daily Reports</a></li>
            </ul>
          </div>
        </li>
      </ul>
    </div>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer p-3 mt-auto">
      <div class="dropdown dropup">
        <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle text-dark" id="dropdownUser"
          data-bs-toggle="dropdown" aria-expanded="false">
          <div
            class="bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center flex-shrink-0 fw-semibold"
            style="width: 32px; height: 32px; font-size: 0.8rem;">JD</div>
          <div class="overflow-hidden me-auto" style="line-height: 1.2;">
            <strong class="d-block small text-truncate">Jane Doe</strong>
            <span class="text-muted" style="font-size: 0.75rem;">Admin</span>
          </div>
        </a>
        <ul class="dropdown-menu dropdown-menu-end text-small shadow border-0" aria-labelledby="dropdownUser">
          <li><a class="dropdown-item" href="#">Profile</a></li>
          <li><a class="dropdown-item" href="#">Settings</a></li>
          <li>
            <hr class="dropdown-divider">
          </li>
          <li><a class="dropdown-item text-danger" href="#">Sign out</a></li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  isCollapsed: Boolean
});
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1045;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  /* এখানে transform এবং width উভয়টিতেই ট্রানজিশন যোগ করা হয়েছে যাতে কোনো জাম্পিং না করে */
  transition: transform 0.3s ease, width 0.3s ease;
}

.sidebar.collapsed {
  transform: translateX(-100%);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-footer {
  border-top: 1px solid #e2e8f0;
}

.sidebar .nav-link {
  color: #475569;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
}

.sidebar .nav-link:hover,
.sidebar .nav-link.active {
  color: #0d6efd;
  background-color: #f1f5f9;
}
</style>