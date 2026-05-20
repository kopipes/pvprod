# PVPROD App Specification

## Access Levels

| Role | Permissions |
|------|-------------|
| **Admin** | See all data, edit all data, manage divisions and users |
| **Head** | See all data, limited edit capabilities |
| **Manager** | See only own division data, create/edit projects in division |
| **User** | See only own project data, create/edit own projects |

## Master Data

- **Division Management** - Create, view, delete divisions
- **User Management** - Create users with role and division assignment

## Project Workflow

### Pre-Loading Phase
1. **Survey Photos (Optional)** - Single or multi-upload with notes per batch
2. **Design Images** - Upload with version history by date, with notes
3. **Work Drawings** - Image/PDF upload with update history by date, notes explaining changes
4. **Workshop Progress** - Timestamped photos with notes, grouped by date

### Loading In Phase
1. **Initial Checklist** - Create and manage checklist items (updatable)
2. **Marking Photos** - Detailed shots, single or multiple with notes
3. **Installation Progress** - Daily photo documentation, grouped by date with notes
4. **Final Loading Checklist** - Review completed items from existing list or add new

### Loading Out Phase
1. **Dismantle Checklist** - Items to be removed
2. **Dismantle Photos** - Before, during, and after cleaning photos
3. **Final Verification Checklist** - Items to check for original state

## Technical Approach

- Single HTML file with embedded CSS and JavaScript
- Vanilla JavaScript with component-based architecture
- LocalStorage for data persistence
- CSS Grid/Flexbox for responsive layout
- Mobile-first design with touch optimization

## Deployment Rules (SOT - Source of Truth)

### GOLDEN RULES
1. **App Code** → GitHub (source of truth for application code)
2. **Database** → VPS (source of truth for all data)
3. **DB Structure Changes** → Backup before updating to enable rollback
4. **Deployment** → Do NOT bother or disrupt existing applications and services

### Deployment Checklist
- Always exclude `*.db` files when creating deployment tarballs
- Never overwrite VPS database with local development database
- Always backup database before structural changes
- Check for port conflicts before starting new services
- Verify existing services are unaffected after deployment

### Port Assignment (VPS)
- Port 3001: PVPROC main app
- Port 3006: Prompt app
- Port 3002: (reserved)
- Port 3003: Budget app
- Port 3005: PMPV app

## Data Model

```
{
  divisions: [{ id, name, createdAt }],
  users: [{ id, name, role, divisionId, createdAt }],
  projects: [{
    id, name, client, divisionId, startDate,
    status: 'pre-loading' | 'loading-in' | 'loading-out' | 'completed',
    createdBy, createdAt,
    preLoading: { survey, design, drawing, workshop },
    loadingIn: { checklist, marking, installation, finalChecklist },
    loadingOut: { dismantleChecklist, photos, finalVerify }
  }]
}
```

Photos stored as base64 data URLs with notes and timestamps. Checklists track completion status per item.