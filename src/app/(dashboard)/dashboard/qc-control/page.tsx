// FILE 3: frontend/src/app/dashboard/qc-control/page.tsx
import QcRunner from "@/features/quality-control/QcRunner";

export default function QcControlPage() {
    return (
        <div className="p-4 md:p-6 h-full">
            <QcRunner />
        </div>
    );
}
